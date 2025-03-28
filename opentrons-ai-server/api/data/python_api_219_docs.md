# [Python Protocol API v2](#)

Python Protocol API

### Table of Contents

- [Welcome](index.html#document-index)
- [Tutorial](index.html#document-tutorial)
- [Versioning](index.html#document-versioning)
- [Labware](index.html#document-new_labware)
- [Moving Labware](index.html#document-moving_labware)
- [Hardware Modules](index.html#document-new_modules)
- [Deck Slots](index.html#document-deck_slots)
- [Pipettes](index.html#document-new_pipette)
- [Building Block Commands](index.html#document-new_atomic_commands)
- [Complex Commands](index.html#document-new_complex_commands)
- [Labware and Deck Positions](index.html#document-robot_position)
- [Runtime Parameters](index.html#document-runtime_parameters)
- [Advanced Control](index.html#document-new_advanced_running)
- [Protocol Examples](index.html#document-new_examples)
- [Adapting OT\-2 Protocols for Flex](index.html#document-adapting_ot2_flex)
- [API Version 2 Reference](index.html#document-new_protocol_api)

---

- [OT\-2 Python API v1](../v1/index.html)

### Related Topics

- [Documentation overview](#)

# Welcome

## Tutorial

### Introduction

This tutorial will guide you through creating a Python protocol file from scratch. At the end of this process you’ll have a complete protocol that can run on a Flex or an OT\-2 robot. If you don’t have a Flex or an OT\-2 (or if you’re away from your lab, or if your robot is in use), you can use the same file to simulate the protocol on your computer instead.

#### What You’ll Automate

The lab task that you’ll automate in this tutorial is serial dilution: taking a solution and progressively diluting it by transferring it stepwise across a plate from column 1 to column 12\. With just a dozen or so lines of code, you can instruct your robot to perform the hundreds of individual pipetting actions necessary to fill an entire 96\-well plate. And all of those liquid transfers will be done automatically, so you’ll have more time to do other work in your lab.

#### Before You Begin

You’re going to write some Python code, but you don’t need to be a Python expert to get started writing Opentrons protocols. You should know some basic Python syntax, like how it uses [indentation](https://docs.python.org/3/reference/lexical_analysis.html#indentation) to group blocks of code, dot notation for [calling methods](https://docs.python.org/3/tutorial/classes.html#method-objects), and the format of [lists](https://docs.python.org/3/tutorial/introduction.html#lists) and [dictionaries](https://docs.python.org/3/tutorial/datastructures.html#dictionaries). You’ll also be using [common control structures](https://docs.python.org/3/tutorial/controlflow.html#if-statements) like `if` statements and `for` loops.

You should write your code in your favorite plaintext editor or development environment and save it in a file with a `.py` extension, like `dilution-tutorial.py`.

To simulate your code, you’ll need [Python 3\.10](https://www.python.org/downloads/) and the [pip package installer](https://pip.pypa.io/en/stable/getting-started/). Newer versions of Python aren’t yet supported by the Python Protocol API. If you don’t use Python 3\.10 as your system Python, we recommend using [pyenv](https://github.com/pyenv/pyenv) to manage multiple Python versions.

#### Hardware and Labware

Before running a protocol, you’ll want to have the right kind of hardware and labware ready for your Flex or OT\-2\.

- **Flex users** should review Chapter 2: Installation and Relocation in the [instruction manual](https://insights.opentrons.com/hubfs/Products/Flex/Opentrons%20Flex%20Manual.pdf). Specifically, see the pipette information in the “Instrument Installation and Calibration” section. You can use either a 1\-channel or 8\-channel pipette for this tutorial. Most Flex code examples will use a [Flex 1\-Channel 1000 µL pipette](https://shop.opentrons.com/opentrons-flex-1-channel-pipette/).
- **OT\-2 users** should review the robot setup and pipette information on the [Get Started page](https://support.opentrons.com/s/ot2-get-started). Specifically, see [attaching pipettes](https://support.opentrons.com/s/article/Get-started-Attach-pipettes) and [initial calibration](https://support.opentrons.com/s/article/Get-started-Calibrate-the-deck). You can use either a single\-channel or 8\-channel pipette for this tutorial. Most OT\-2 code examples will use a [P300 Single\-Channel GEN2](https://shop.opentrons.com/single-channel-electronic-pipette-p20/) pipette.

The Flex and OT\-2 use similar labware for serial dilution. The tutorial code will use the labware listed in the table below, but as long as you have labware of each type you can modify the code to run with your labware.

| Labware type   | Labware name                                                                                    | API load name                     |
| -------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- |
| Reservoir      | [NEST 12 Well Reservoir 15 mL](https://labware.opentrons.com/nest_12_reservoir_15ml)            | `nest_12_reservoir_15ml`          |
| Well plate     | [NEST 96 Well Plate 200 µL Flat](https://labware.opentrons.com/nest_96_wellplate_200ul_flat)    | `nest_96_wellplate_200ul_flat`    |
| Flex tip rack  | [Opentrons Flex Tips, 200 µL](https://shop.opentrons.com/opentrons-flex-tips-200-l/)            | `opentrons_flex_96_tiprack_200ul` |
| OT\-2 tip rack | [Opentrons 96 Tip Rack](https://labware.opentrons.com/?category=tipRack&manufacturer=Opentrons) | `opentrons_96_tiprack_300ul`      |

For the liquids, you can use plain water as the diluent and water dyed with food coloring as the solution.

### Create a Protocol File

Let’s start from scratch to create your serial dilution protocol. Open up a new file in your editor and start with the line:

```
from opentrons import protocol_api

```

Throughout this documentation, you’ll see protocols that begin with the `import` statement shown above. It identifies your code as an Opentrons protocol. This statement is not required, but including it is a good practice and allows most code editors to provide helpful autocomplete suggestions.

Everything else in the protocol file is required. Next, you’ll specify the version of the API you’re using. Then comes the core of the protocol: defining a single `run()` function that provides the locations of your labware, states which kind of pipettes you’ll use, and finally issues the commands that the robot will perform.

For this tutorial, you’ll write very little Python outside of the `run()` function. But for more complex applications it’s worth remembering that your protocol file _is_ a Python script, so any Python code that can run on your robot can be a part of a protocol.

#### Metadata

Every protocol needs to have a metadata dictionary with information about the protocol. At minimum, you need to specify what [version of the API](index.html#version-table) the protocol requires. The [scripts](https://github.com/Opentrons/opentrons/blob/edge/api/docs/v2/example_protocols/) for this tutorial were validated against API version 2\.16, so specify:

```
metadata = {"apiLevel": "2.16"}

```

You can include any other information you like in the metadata dictionary. The fields `protocolName`, `description`, and `author` are all displayed in the Opentrons App, so it’s a good idea to expand the dictionary to include them:

```
metadata = {
    "apiLevel": "2.16",
    "protocolName": "Serial Dilution Tutorial",
    "description": """This protocol is the outcome of following the
                   Python Protocol API Tutorial located at
                   https://docs.opentrons.com/v2/tutorial.html. It takes a
                   solution and progressively dilutes it by transferring it
                   stepwise across a plate.""",
    "author": "New API User"
    }

```

Note, if you have a Flex, or are using an OT\-2 with API v2\.15 (or higher), we recommend adding a `requirements` section to your code. See the Requirements section below.

#### Requirements

The `requirements` code block can appear before _or_ after the `metadata` code block in a Python protocol. It uses the following syntax and accepts two arguments: `robotType` and `apiLevel`.

Whether you need a `requirements` block depends on your robot model and API version.

- **Flex:** The `requirements` block is always required. And, the API version does not go in the `metadata` section. The API version belongs in the `requirements`. For example:

```
requirements = {"robotType": "Flex", "apiLevel": "2.16"}

```

- **OT\-2:** The `requirements` block is optional, but including it is a recommended best practice, particularly if you’re using API version 2\.15 or greater. If you do use it, remember to remove the API version from the `metadata`. For example:

```
requirements = {"robotType": "OT-2", "apiLevel": "2.16"}

```

With the metadata and requirements defined, you can move on to creating the `run()` function for your protocol.

#### The `run()` function

Now it’s time to actually instruct the Flex or OT\-2 how to perform serial dilution. All of this information is contained in a single Python function, which has to be named `run`. This function takes one argument, which is the _protocol context_. Many examples in these docs use the argument name `protocol`, and sometimes they specify the argument’s type:

```
def run(protocol: protocol_api.ProtocolContext):

```

With the protocol context argument named and typed, you can start calling methods on `protocol` to add labware and hardware.

##### Labware

For serial dilution, you need to load a tip rack, reservoir, and 96\-well plate on the deck of your Flex or OT\-2\. Loading labware is done with the [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') method of the protocol context, which takes two arguments: the standard labware name as defined in the [Opentrons Labware Library](https://labware.opentrons.com/), and the position where you’ll place the labware on the robot’s deck.

### Flex

Here’s how to load the labware on a Flex in slots D1, D2, and D3 (repeating the `def` statement from above to show proper indenting):

```
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "D2")
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D3")

```

If you’re using a different model of labware, find its name in the Labware Library and replace it in your code.

Now the robot will expect to find labware in a configuration that looks like this:

### OT-2

Here’s how to load the labware on an OT\-2 in slots 1, 2, and 3 (repeating the `def` statement from above to show proper indenting):

```
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)

```

If you’re using a different model of labware, find its name in the Labware Library and replace it in your code.

Now the robot will expect to find labware in a configuration that looks like this:

You may notice that these deck maps don’t show where the liquids will be at the start of the protocol. Liquid definitions aren’t required in Python protocols, unlike protocols made in [Protocol Designer](https://designer.opentrons.com/). If you want to identify liquids, see [Labeling Liquids in Wells](https://docs.opentrons.com/v2/new_labware.html#labeling-liquids-in-wells). (Sneak peek: you’ll put the diluent in column 1 of the reservoir and the solution in column 2 of the reservoir.)

##### Trash Bin

Flex and OT\-2 both come with a trash bin for disposing used tips.

The OT\-2 trash bin is fixed in slot 12\. Since it can’t go anywhere else on the deck, you don’t need to write any code to tell the API where it is. Skip ahead to the Pipettes section below.

Flex lets you put a [trash bin](index.html#configure-trash-bin) in multiple locations on the deck. You can even have more than one trash bin, or none at all (if you use the [waste chute](index.html#configure-waste-chute) instead, or if your protocol never trashes any tips). For serial dilution, you’ll need to dispose used tips, so you also need to tell the API where the trash container is located on your robot. Loading a trash bin on Flex is done with the [`load_trash_bin()`](index.html#opentrons.protocol_api.ProtocolContext.load_trash_bin 'opentrons.protocol_api.ProtocolContext.load_trash_bin') method, which takes one argument: its location. Here’s how to load the trash in slot A3:

```
trash = protocol.load_trash_bin("A3")

```

##### Pipettes

Next you’ll specify what pipette to use in the protocol. Loading a pipette is done with the [`load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') method, which takes three arguments: the name of the pipette, the mount it’s installed in, and the tip racks it should use when performing transfers. Load whatever pipette you have installed in your robot by using its [standard pipette name](index.html#new-pipette-models). Here’s how to load the pipette in the left mount and instantiate it as a variable named `left_pipette`:

```
# Flex
left_pipette = protocol.load_instrument("flex_1channel_1000", "left", tip_racks=[tips])

```

```
# OT-2
left_pipette = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tips])

```

Since the pipette is so fundamental to the protocol, it might seem like you should have specified it first. But there’s a good reason why pipettes are loaded after labware: you need to have already loaded `tips` in order to tell the pipette to use it. And now you won’t have to reference `tips` again in your code — it’s assigned to the `left_pipette` and the robot will know to use it when commanded to pick up tips.

Note

You may notice that the value of `tip_racks` is in brackets, indicating that it’s a list. This serial dilution protocol only uses one tip rack, but some protocols require more tips, so you can assign them to a pipette all at once, like `tip_racks=[tips1, tips2]`.

##### Commands

Finally, all of your labware and hardware is in place, so it’s time to give the robot pipetting commands. The required steps of the serial dilution process break down into three main phases:

1. Measure out equal amounts of diluent from the reservoir to every well on the plate.
2. Measure out equal amounts of solution from the reservoir into wells in the first column of the plate.
3. Move a portion of the combined liquid from column 1 to 2, then from column 2 to 3, and so on all the way to column 12\.

Thanks to the flexibility of the API’s [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') method, which combines many [building block commands](index.html#v2-atomic-commands) into one call, each of these phases can be accomplished with a single line of code! You’ll just have to write a few more lines of code to repeat the process for as many rows as you want to fill.

Let’s start with the diluent. This phase takes a larger quantity of liquid and spreads it equally to many wells. `transfer()` can handle this all at once, because it accepts either a single well or a list of wells for its source and destination:

```
left_pipette.transfer(100, reservoir["A1"], plate.wells())

```

Breaking down these single lines of code shows the power of [complex commands](index.html#v2-complex-commands). The first argument is the amount to transfer to each destination, 100 µL. The second argument is the source, column 1 of the reservoir (which is still specified with grid\-style coordinates as `A1` — a reservoir only has an A row). The third argument is the destination. Here, calling the [`wells()`](index.html#opentrons.protocol_api.Labware.wells 'opentrons.protocol_api.Labware.wells') method of `plate` returns a list of _every well_, and the command will apply to all of them.

In plain English, you’ve instructed the robot, “For every well on the plate, aspirate 100 µL of fluid from column 1 of the reservoir and dispense it in the well.” That’s how we understand this line of code as scientists, yet the robot will understand and execute it as nearly 200 discrete actions.

Now it’s time to start mixing in the solution. To do this row by row, nest the commands in a `for` loop:

```
for i in range(8):
    row = plate.rows()[i]

```

Using Python’s built\-in [`range`](https://docs.python.org/3/library/stdtypes.html#range '(in Python v3.12)') class is an easy way to repeat this block 8 times, once for each row. This also lets you use the repeat index `i` with `plate.rows()` to keep track of the current row.

In each row, you first need to add solution. This will be similar to what you did with the diluent, but putting it only in column 1 of the plate. It’s best to mix the combined solution and diluent thoroughly, so add the optional `mix_after` argument to `transfer()`:

```
left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))

```

As before, the first argument specifies to transfer 100 µL. The second argument is the source, column 2 of the reservoir. The third argument is the destination, the element at index 0 of the current `row`. Since Python lists are zero\-indexed, but columns on labware start numbering at 1, this will be well A1 on the first time through the loop, B1 the second time, and so on. The fourth argument specifies to mix 3 times with 50 µL of fluid each time.

Finally, it’s time to dilute the solution down the row. One approach would be to nest another `for` loop here, but instead let’s use another feature of the `transfer()` method, taking lists as the source and destination arguments:

```
left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))

```

There’s some Python shorthand here, so let’s unpack it. You can get a range of indices from a list using the colon `:` operator, and omitting it at either end means “from the beginning” or “until the end” of the list. So the source is `row[:11]`, from the beginning of the row until its 11th item. And the destination is `row[1:]`, from index 1 (column 2!) until the end. Since both of these lists have 11 items, `transfer()` will _step through them in parallel_, and they’re constructed so when the source is 0, the destination is 1; when the source is 1, the destination is 2; and so on. This condenses all of the subsequent transfers down the row into a single line of code.

All that remains is for the loop to repeat these steps, filling each row down the plate.

That’s it! If you’re using a single\-channel pipette, you’re ready to try out your protocol.

##### 8\-Channel Pipette

If you’re using an 8\-channel pipette, you’ll need to make a couple tweaks to the single\-channel code from above. Most importantly, whenever you target a well in row A of a plate with an 8\-channel pipette, it will move its topmost tip to row A, lining itself up over the entire column.

Thus, when adding the diluent, instead of targeting every well on the plate, you should only target the top row:

```
left_pipette.transfer(100, reservoir["A1"], plate.rows()[0])

```

And by accessing an entire column at once, the 8\-channel pipette effectively implements the `for` loop in hardware, so you’ll need to remove it:

```
row = plate.rows()[0]
left_pipette.transfer(100, reservoir["A2"], row[0], mix_after=(3, 50))
left_pipette.transfer(100, row[:11], row[1:], mix_after=(3, 50))

```

Instead of tracking the current row in the `row` variable, this code sets it to always be row A (index 0\).

### Try Your Protocol

There are two ways to try out your protocol: simulation on your computer, or a live run on a Flex or OT\-2\. Even if you plan to run your protocol on a robot, it’s a good idea to check the simulation output first.

If you get any errors in simulation, or you don’t get the outcome you expected when running your protocol, you can check your code against these reference protocols on GitHub:

- [Flex: Single\-channel serial dilution](https://github.com/Opentrons/opentrons/blob/edge/api/docs/v2/example_protocols/dilution_tutorial_flex.py)
- [Flex: 8\-channel serial dilution](https://github.com/Opentrons/opentrons/blob/edge/api/docs/v2/example_protocols/dilution_tutorial_multi_flex.py)
- [OT\-2: Single\-channel serial dilution](https://github.com/Opentrons/opentrons/blob/edge/api/docs/v2/example_protocols/dilution_tutorial.py)
- [OT\-2: 8\-channel serial dilution](https://github.com/Opentrons/opentrons/blob/edge/api/docs/v2/example_protocols/dilution_tutorial_multi.py)

#### In Simulation

Simulation doesn’t require having a robot connected to your computer. You just need to install the [Opentrons Python module](https://pypi.org/project/opentrons/) using pip (`pip install opentrons`). This will give you access to the `opentrons_simulate` command\-line utility (`opentrons_simulate.exe` on Windows).

To see a text preview of the steps your Flex or OT\-2 will take, use the change directory (`cd`) command to navigate to the location of your saved protocol file and run:

```
opentrons_simulate dilution-tutorial.py

```

This should generate a lot of output! As written, the protocol has about 1000 steps. In fact, using a single\-channel pipette for serial dilution across the whole plate will take about half an hour — plenty of time to grab a coffee while your robot pipettes for you! ☕️

If that’s too long, you can always cancel your run partway through or modify `for i in range(8)` to loop through fewer rows.

#### On a Robot

The simplest way to run your protocol on a Flex or OT\-2 is to use the [Opentrons App](https://opentrons.com/ot-app). When you first launch the Opentrons App, you will see the Protocols screen. (Click **Protocols** in the left sidebar to access it at any other time.) Click **Import** in the top right corner to reveal the Import a Protocol pane. Then click **Choose File** and find your protocol in the system file picker, or drag and drop your protocol file into the well.

You should see “Protocol \- Serial Dilution Tutorial” (or whatever `protocolName` you entered in the metadata) in the list of protocols. Click the three\-dot menu (⋮) for your protocol and choose **Start setup**.

If you have any remaining calibration tasks to do, you can finish them up here. Below the calibration section is a preview of the initial deck state. Optionally you can run Labware Position Check, or you can go ahead and click **Proceed to Run**.

On the Run tab, you can double\-check the Run Preview, which is similar to the command\-line simulation output. Make sure all your labware and liquids are in the right place, and then click **Start run**. The run log will update in real time as your robot proceeds through the steps.

When it’s all done, check the results of your serial dilution procedure — you should have a beautiful dye gradient running across the plate!

### Next Steps

This tutorial has relied heavily on the `transfer()` method, but there’s much more that the Python Protocol API can do. Many advanced applications use [building block commands](index.html#v2-atomic-commands) for finer control over the robot. These commands let you aspirate and dispense separately, add air gaps, blow out excess liquid, move the pipette to any location, and more. For protocols that use [Opentrons hardware modules](index.html#new-modules), there are methods to control their behavior. And all of the API’s classes and methods are catalogued in the [API Reference](index.html#protocol-api-reference).

## Versioning

The Python Protocol API has its own versioning system, which is separate from the versioning system used for the robot software and the Opentrons App. This allows protocols to run on newer robot software versions without modification.

### Major and Minor Versions

The API uses a major and minor version number and does not use patch version numbers. For instance, major version 2 and minor version 0 is written as `2.0`. Versions are not decimal numbers, so `2.10` indicates major version 2 and minor version 10\. The Python Protocol API version will only increase based on changes that affect protocol behavior.

The major version of the API increases whenever there are significant structural or behavioral changes to protocols. For instance, major version 2 of the API was introduced because it required protocols to have a `run` function that takes a `protocol` argument rather than importing the `robot`, `instruments`, and `labware` modules. Protocols written with major version 1 of the API will not run without modification in major version 2\. A similar level of structural change would require a major version 3\. This documentation only deals with features found in major version 2 of the API; see the [archived version 1 documentation](https://docs.opentrons.com/v1/index.html) for information on older protocols.

The minor version of the API increases whenever there is new functionality that might change the way a protocol is written, or when a behavior changes in one aspect of the API but does not affect all protocols. For instance, adding support for a new hardware module, adding new parameters for a function, or deprecating a feature would increase the minor version of the API.

### Specifying Versions

You must specify the API version you are targeting in your Python protocol. In all minor versions, you can do this with the `apiLevel` key in the `metadata` dictionary, alongside any other metadata elements:

```
 from opentrons import protocol_api

 metadata = {
     "apiLevel": "2.19",
     "author": "A. Biologist"}

 def run(protocol: protocol_api.ProtocolContext):
     protocol.comment("Hello, world!")

```

From version 2\.15 onward, you can specify `apiLevel` in the `requirements` dictionary instead:

```
 from opentrons import protocol_api

 metadata = {"author": "A. Biologist"}
 requirements = {"apiLevel": "2.19", "robotType": "Flex"}

 def run(protocol: protocol_api.ProtocolContext):
     protocol.comment("Hello, Flex!")

```

Choose only one of these places to specify `apiLevel`. If you put it in neither or both places, you will not be able to simulate or run your protocol.

The version you specify determines the features and behaviors available to your protocol. For example, support for the Heater\-Shaker Module was added in version 2\.13, so you can’t specify a lower version and then call `HeaterShakerContext` methods without causing an error. This protects you from accidentally using features not present in your specified API version, and keeps your protocol portable between API versions.

When choosing an API level, consider what features you need and how widely you plan to share your protocol. Throughout the Python Protocol API documentation, there are version statements indicating when elements (features, function calls, available properties, etc.) were introduced. Keep these in mind when specifying your protocol’s API version. Version statements look like this:

New in version 2\.0\.

On the one hand, using the highest available version will give your protocol access to all the latest [features and fixes](#version-notes). On the other hand, using the lowest possible version lets the protocol work on a wider range of robot software versions. For example, a protocol that uses the Heater\-Shaker and specifies version 2\.13 of the API should work equally well on a robot running version 6\.1\.0 or 6\.2\.0 of the robot software. Specifying version 2\.14 would limit the protocol to robots running 6\.2\.0 or higher.

### Maximum Supported Versions

The maximum supported API version for your robot is listed in the Opentrons App under **Robots** \> your robot \> **Robot Settings** \> **Advanced**. Before version 6\.0\.0 of the app, the same information was listed on your robot’s **Information** card.

If you upload a protocol that specifies a higher API level than the maximum supported, your robot won’t be able to analyze or run your protocol. You can increase the maximum supported version by updating your robot software and Opentrons App.

Opentrons robots running the latest software (7\.3\.0\) support the following version ranges:

> - **Flex:** version 2\.15–2\.19\.
> - **OT\-2:** versions 2\.0–2\.19\.

### API and Robot Software Versions

This table lists the correspondence between Protocol API versions and robot software versions.

| API Version | Introduced in Robot Software |
| ----------- | ---------------------------- |
| 2\.19       | 7\.3\.1                      |
| 2\.18       | 7\.3\.0                      |
| 2\.17       | 7\.2\.0                      |
| 2\.16       | 7\.1\.0                      |
| 2\.15       | 7\.0\.0                      |
| 2\.14       | 6\.3\.0                      |
| 2\.13       | 6\.1\.0                      |
| 2\.12       | 5\.0\.0                      |
| 2\.11       | 4\.4\.0                      |
| 2\.10       | 4\.3\.0                      |
| 2\.9        | 4\.1\.0                      |
| 2\.8        | 4\.0\.0                      |
| 2\.7        | 3\.21\.0                     |
| 2\.6        | 3\.20\.0                     |
| 2\.5        | 3\.19\.0                     |
| 2\.4        | 3\.17\.1                     |
| 2\.3        | 3\.17\.0                     |
| 2\.2        | 3\.16\.0                     |
| 2\.1        | 3\.15\.2                     |
| 2\.0        | 3\.14\.0                     |
| 1\.0        | 3\.0\.0                      |

### Changes in API Versions

#### Version 2\.19

Opentrons recommends updating protocols from `apiLevel` 2\.18 to 2\.19 to take advantage of improved pipetting behavior.

- This version uses new values for how much a tip overlaps with the pipette nozzle when the pipette picks up tips. This can correct errors caused by the robot positioning the tip slightly lower than intended, potentially making contact with labware. See [`pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') for additional details.

#### Version 2\.18

- Define customizable parameters with the new `add_parameters()` function, and access their values on the [`ProtocolContext.params`](index.html#opentrons.protocol_api.ProtocolContext.params 'opentrons.protocol_api.ProtocolContext.params') object during a protocol run. See [Runtime Parameters](index.html#runtime-parameters) and related pages for more information.
- Move the pipette to positions relative to the top of a trash container. See [Position Relative to Trash Containers](index.html#position-relative-trash). The default behavior of [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') also accounts for this new possibility.
- [`set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset') has been restored to the API with new behavior that applies to labware type–location pairs.
- Automatic tip tracking is now available for all nozzle configurations.

#### Version 2\.17

- [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') now raises an error if you try to dispense more than [`InstrumentContext.current_volume`](index.html#opentrons.protocol_api.InstrumentContext.current_volume 'opentrons.protocol_api.InstrumentContext.current_volume').

#### Version 2\.16

This version introduces new features for Flex and adds and improves methods for aspirating and dispensing. Note that when updating Flex protocols to version 2\.16, you _must_ load a trash container before dropping tips.

- New features

  - Use [`configure_nozzle_layout()`](index.html#opentrons.protocol_api.InstrumentContext.configure_nozzle_layout 'opentrons.protocol_api.InstrumentContext.configure_nozzle_layout') to pick up a single column of tips with the 96\-channel pipette. See [Partial Tip Pickup](index.html#partial-tip-pickup).
  - Specify the trash containers attached to your Flex with [`load_waste_chute()`](index.html#opentrons.protocol_api.ProtocolContext.load_waste_chute 'opentrons.protocol_api.ProtocolContext.load_waste_chute') and [`load_trash_bin()`](index.html#opentrons.protocol_api.ProtocolContext.load_trash_bin 'opentrons.protocol_api.ProtocolContext.load_trash_bin').
  - Dispense, blow out, drop tips, and dispose labware in the waste chute. Disposing labware requires the gripper and calling [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') with `use_gripper=True`.
  - Perform actions in staging area slots by referencing slots A4 through D4\. See [Deck Slots](index.html#deck-slots).
  - Explicitly command a pipette to [`prepare_to_aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.prepare_to_aspirate 'opentrons.protocol_api.InstrumentContext.prepare_to_aspirate'). The API usually prepares pipettes to aspirate automatically, but this is useful for certain applications, like pre\-wetting routines.

- Improved features

  - [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate'), [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense'), and [`mix()`](index.html#opentrons.protocol_api.InstrumentContext.mix 'opentrons.protocol_api.InstrumentContext.mix') will not move any liquid when called with `volume=0`.

- Other changes

  - [`ProtocolContext.fixed_trash`](index.html#opentrons.protocol_api.ProtocolContext.fixed_trash 'opentrons.protocol_api.ProtocolContext.fixed_trash') and [`InstrumentContext.trash_container`](index.html#opentrons.protocol_api.InstrumentContext.trash_container 'opentrons.protocol_api.InstrumentContext.trash_container') now return [`TrashBin`](index.html#opentrons.protocol_api.TrashBin 'opentrons.protocol_api.TrashBin') objects instead of [`Labware`](index.html#opentrons.protocol_api.Labware 'opentrons.protocol_api.Labware') objects.
  - Flex will no longer automatically drop tips in the trash at the end of a protocol. You can add a [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') command to your protocol or use the Opentrons App to drop the tips.

#### Version 2\.15

This version introduces support for the Opentrons Flex robot, instruments, modules, and labware.

- Flex features

  - Write protocols for Opentrons Flex by declaring `"robotType": "Flex"` in the new `requirements` dictionary. See the [examples in the Tutorial](index.html#tutorial-requirements).
  - [`load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') supports loading Flex 1\-, 8\-, and 96\-channel pipettes. See [Loading Pipettes](index.html#new-create-pipette).
  - The new [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') method can move labware automatically using the Flex Gripper. You can also move labware manually on Flex.
  - [`load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') supports loading the [Magnetic Block](index.html#magnetic-block).
  - The API does not enforce placement restrictions for the Heater\-Shaker module on Flex, because it is installed below\-deck in a module caddy. Pipetting restrictions are still in place when the Heater\-Shaker is shaking or its labware latch is open.
  - The new [`configure_for_volume()`](index.html#opentrons.protocol_api.InstrumentContext.configure_for_volume 'opentrons.protocol_api.InstrumentContext.configure_for_volume') method can place Flex 50 µL pipettes in a low\-volume mode for dispensing very small volumes of liquid. See [Volume Modes](index.html#pipette-volume-modes).

- Flex and OT\-2 features

  - Optionally specify `apiLevel` in the new `requirements` dictionary (otherwise, specify it in `metadata`).
  - Optionally specify `"robotType": "OT-2"` in `requirements`.
  - Use coordinates or numbers to specify [deck slots](index.html#deck-slots). These formats match physical labels on Flex and OT\-2, but you can use either system, regardless of `robotType`.
  - The new module context `load_adapter()` methods let you load adapters and labware separately on modules, and [`ProtocolContext.load_adapter()`](index.html#opentrons.protocol_api.ProtocolContext.load_adapter 'opentrons.protocol_api.ProtocolContext.load_adapter') lets you load adapters directly in deck slots. See [Loading Labware on Adapters](index.html#labware-on-adapters).
  - Move labware manually using [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware'), without having to stop your protocol.
  - Manual labware moves support moving to or from the new [`OFF_DECK`](index.html#opentrons.protocol_api.OFF_DECK 'opentrons.protocol_api.OFF_DECK') location (outside of the robot).
  - [`ProtocolContext.load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') also accepts [`OFF_DECK`](index.html#opentrons.protocol_api.OFF_DECK 'opentrons.protocol_api.OFF_DECK') as a location. This lets you prepare labware to be moved onto the deck later in a protocol.
  - The new `push_out` parameter of the [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') method helps ensure that the pipette dispenses all of its liquid when working with very small volumes.
  - By default, repeated calls to [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') cycle through multiple locations above the trash bin to prevent tips from stacking up.

- Bug fixes

  - [`InstrumentContext.starting_tip`](index.html#opentrons.protocol_api.InstrumentContext.starting_tip 'opentrons.protocol_api.InstrumentContext.starting_tip') is now respected on the second and subsequent calls to [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') with no argument.

#### Version 2\.14

This version introduces a new protocol runtime that offers more reliable run control
and builds a strong foundation for future Protocol API improvements.

Several older parts of the Protocol API were deprecated as part of this switchover.
If you specify an API version of `2.13` or lower, your protocols will continue to execute on the old runtime.

- Feature additions

  - [`ProtocolContext.define_liquid()`](index.html#opentrons.protocol_api.ProtocolContext.define_liquid 'opentrons.protocol_api.ProtocolContext.define_liquid') and [`Well.load_liquid()`](index.html#opentrons.protocol_api.Well.load_liquid 'opentrons.protocol_api.Well.load_liquid') added
    to define different liquid types and add them to wells, respectively.

- Bug fixes

  - [`Labware`](index.html#opentrons.protocol_api.Labware 'opentrons.protocol_api.Labware') and [`Well`](index.html#opentrons.protocol_api.Well 'opentrons.protocol_api.Well') now adhere to the protocol’s API level setting.
    Prior to this version, they incorrectly ignored the setting.
  - [`InstrumentContext.touch_tip()`](index.html#opentrons.protocol_api.InstrumentContext.touch_tip 'opentrons.protocol_api.InstrumentContext.touch_tip') will end with the pipette tip in the center of the well
    instead of on the edge closest to the front of the machine.
  - [`ProtocolContext.load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') now prefers loading user\-provided labware definitions
    rather than built\-in definitions if no explicit `namespace` is specified.
  - [`ProtocolContext.pause()`](index.html#opentrons.protocol_api.ProtocolContext.pause 'opentrons.protocol_api.ProtocolContext.pause') will now properly wait until you resume the protocol before moving on.
    In previous versions, the run will not pause until the first call to a different `ProtocolContext` method.
  - Motion planning has been improved to avoid certain erroneous downward movements,
    especially when using [`InstrumentContext.aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate').
  - [`Labware.reset()`](index.html#opentrons.protocol_api.Labware.reset 'opentrons.protocol_api.Labware.reset') and [`Labware.tip_length`](index.html#opentrons.protocol_api.Labware.tip_length 'opentrons.protocol_api.Labware.tip_length') will raise useful errors if called on labware that is not a tip rack.

- Removals

  - The `presses` and `increment` arguments of [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') were deprecated.
    Configure your pipette pick\-up settings with the Opentrons App, instead.
  - `InstrumentContext.speed` property was removed.
    This property tried to allow setting a pipette’s **plunger** speed in mm/s.
    However, it could only approximately set the plunger speed,
    because the plunger’s speed is a stepwise function of the volume.
    Use [`InstrumentContext.flow_rate`](index.html#opentrons.protocol_api.InstrumentContext.flow_rate 'opentrons.protocol_api.InstrumentContext.flow_rate') to set the flow rate in µL/s, instead.
  - `load_labware_object()` was removed from module contexts as an unnecessary internal method.
  - `geometry` was removed from module contexts in favor of
    `model` and `type` attributes.
  - `Well.geometry` was removed as unnecessary.
  - `MagneticModuleContext.calibrate` was removed since it was never needed nor implemented.
  - The `height` parameter of [`MagneticModuleContext.engage()`](index.html#opentrons.protocol_api.MagneticModuleContext.engage 'opentrons.protocol_api.MagneticModuleContext.engage') was removed.
    Use `offset` or `height_from_base` instead.
  - `Labware.separate_calibration` and [`Labware.set_calibration()`](index.html#opentrons.protocol_api.Labware.set_calibration 'opentrons.protocol_api.Labware.set_calibration') were removed,
    since they were holdovers from a calibration system that no longer exists.
  - Various methods and setters were removed that could modify tip state outside of
    calls to [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') and [`InstrumentContext.drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip').
    This change allows the robot to track tip usage more completely and reliably.
    You may still use [`Labware.reset()`](index.html#opentrons.protocol_api.Labware.reset 'opentrons.protocol_api.Labware.reset') and [`InstrumentContext.reset_tipracks()`](index.html#opentrons.protocol_api.InstrumentContext.reset_tipracks 'opentrons.protocol_api.InstrumentContext.reset_tipracks')
    to reset your tip racks’ state.

  > - The [`Well.has_tip`](index.html#opentrons.protocol_api.Well.has_tip 'opentrons.protocol_api.Well.has_tip') **setter** was removed. **The getter is still supported.**
  >   - Internal methods `Labware.use_tips`, `Labware.previous_tip`, and `Labware.return_tips`
  >     were removed.

  - The `configuration` argument of [`ProtocolContext.load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') was removed
    because it made unsafe modifications to the protocol’s geometry system,
    and the Thermocycler’s “semi” configuration is not officially supported.

- Known limitations

  - [`Labware.set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset') is not yet supported on this API version.
    Run protocols via the Opentrons App, instead.
  - [`ProtocolContext.max_speeds`](index.html#opentrons.protocol_api.ProtocolContext.max_speeds 'opentrons.protocol_api.ProtocolContext.max_speeds') is not yet supported on the API version.
    Use [`InstrumentContext.default_speed`](index.html#opentrons.protocol_api.InstrumentContext.default_speed 'opentrons.protocol_api.InstrumentContext.default_speed') or the per\-method speed argument, instead.
  - [`InstrumentContext.starting_tip`](index.html#opentrons.protocol_api.InstrumentContext.starting_tip 'opentrons.protocol_api.InstrumentContext.starting_tip') is not respected on the second and subsequent calls to [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') with no argument.

#### Version 2\.13

- Adds [`HeaterShakerContext`](index.html#opentrons.protocol_api.HeaterShakerContext 'opentrons.protocol_api.HeaterShakerContext') to support the Heater\-Shaker Module. You can use the load name `heaterShakerModuleV1` with [`ProtocolContext.load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') to add a Heater\-Shaker to a protocol.
- [`InstrumentContext.drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') now has a `prep_after` parameter.
- [`InstrumentContext.home()`](index.html#opentrons.protocol_api.InstrumentContext.home 'opentrons.protocol_api.InstrumentContext.home') may home _both_ pipettes as needed to avoid collision risks.
- [`InstrumentContext.aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate') and [`InstrumentContext.dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') will avoid interacting directly with modules.

#### Version 2\.12

- [`ProtocolContext.resume()`](index.html#opentrons.protocol_api.ProtocolContext.resume 'opentrons.protocol_api.ProtocolContext.resume') has been deprecated.
- [`Labware.set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset') has been added to apply labware offsets to protocols run (exclusively) outside of the Opentrons App (Jupyter Notebook and SSH).

#### Version 2\.11

- Attempting to aspirate from or dispense to tip racks will raise an error.

#### Version 2\.10

- Moving to the same well twice in a row with different pipettes no longer results in strange diagonal movements.

#### Version 2\.9

- You can now access certain geometry data regarding a labware’s well via a Well Object. See [Well Dimensions](index.html#new-labware-well-properties) for more information.

#### Version 2\.8

- You can now pass in a list of volumes to distribute and consolidate. See [List of Volumes](index.html#distribute-consolidate-volume-list) for more information.

  - Passing in a zero volume to any [complex command](index.html#v2-complex-commands) will result in no actions taken for aspirate or dispense

- [`Well.from_center_cartesian()`](index.html#opentrons.protocol_api.Well.from_center_cartesian 'opentrons.protocol_api.Well.from_center_cartesian') can be used to find a point within a well using normalized distance from the center in each axis.

  - Note that you will need to create a location object to use this function in a protocol. See [Labware](index.html#protocol-api-labware) for more information.

- You can now pass in a blowout location to transfer, distribute, and consolidate
  with the `blowout_location` parameter. See [`InstrumentContext.transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') for more detail!

#### Version 2\.7

- Added `InstrumentContext.pair_with()`, an experimental feature for moving both pipettes simultaneously.

Note

This feature has been removed from the Python Protocol API.

- Calling [`InstrumentContext.has_tip()`](index.html#opentrons.protocol_api.InstrumentContext.has_tip 'opentrons.protocol_api.InstrumentContext.has_tip') will return whether a particular instrument
  has a tip attached or not.

#### Version 2\.6

- GEN2 Single pipettes now default to flow rates equivalent to 10 mm/s plunger
  speeds

      + Protocols that manually configure pipette flow rates will be unaffected
      + For a comparison between API Versions, see [OT\-2 Pipette Flow Rates](index.html#ot2-flow-rates)

#### Version 2\.5

- New [utility commands](index.html#new-utility-commands) were added:

  - [`ProtocolContext.set_rail_lights()`](index.html#opentrons.protocol_api.ProtocolContext.set_rail_lights 'opentrons.protocol_api.ProtocolContext.set_rail_lights'): turns robot rail lights on or off
  - [`ProtocolContext.rail_lights_on`](index.html#opentrons.protocol_api.ProtocolContext.rail_lights_on 'opentrons.protocol_api.ProtocolContext.rail_lights_on'): describes whether or not the rail lights are on
  - [`ProtocolContext.door_closed`](index.html#opentrons.protocol_api.ProtocolContext.door_closed 'opentrons.protocol_api.ProtocolContext.door_closed'): describes whether the robot door is closed

#### Version 2\.4

- The following improvements were made to the `touch_tip` command:

  - The speed for `touch_tip` can now be lowered down to 1 mm/s
  - `touch_tip` no longer moves diagonally from the X direction \-\> Y direction
  - Takes into account geometry of the deck and modules

#### Version 2\.3

- Magnetic Module GEN2 and Temperature Module GEN2 are now supported; you can load them with the names `"magnetic module gen2"` and `"temperature module gen2"`, respectively.
- All pipettes will return tips to tip racks from a higher position to avoid
  possible collisions.
- During a [`mix()`](index.html#opentrons.protocol_api.InstrumentContext.mix 'opentrons.protocol_api.InstrumentContext.mix'), the pipette will no longer move up to clear the liquid in
  between every dispense and following aspirate.
- You can now access the Temperature Module’s status via [`TemperatureModuleContext.status`](index.html#opentrons.protocol_api.TemperatureModuleContext.status 'opentrons.protocol_api.TemperatureModuleContext.status').

#### Version 2\.2

- You should now specify Magnetic Module engage height using the
  `height_from_base` parameter, which specifies the height of the top of the
  magnet from the base of the labware. For more, see [Engaging and Disengaging](index.html#magnetic-module-engage).
- Return tip will now use pre\-defined heights from hardware testing. For more information, see [Returning a Tip](index.html#pipette-return-tip).
- When using the return tip function, tips are no longer added back into the tip tracker. For more information, see [Returning a Tip](index.html#pipette-return-tip).

#### Version 2\.1

- When loading labware onto a module, you can now specify a label with the `label` parameter of
  [`MagneticModuleContext.load_labware()`](index.html#opentrons.protocol_api.MagneticModuleContext.load_labware 'opentrons.protocol_api.MagneticModuleContext.load_labware'),
  [`TemperatureModuleContext.load_labware()`](index.html#opentrons.protocol_api.TemperatureModuleContext.load_labware 'opentrons.protocol_api.TemperatureModuleContext.load_labware'), or
  [`ThermocyclerContext.load_labware()`](index.html#opentrons.protocol_api.ThermocyclerContext.load_labware 'opentrons.protocol_api.ThermocyclerContext.load_labware'),
  just like you can when loading labware onto the deck with [`ProtocolContext.load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware').

#### Version 2\.0

Version 2 of the API is a new way to write Python protocols, with support for new modules like the Thermocycler. To transition your protocols from version 1 to version 2 of the API, follow this [migration guide](http://support.opentrons.com/en/articles/3425727-switching-your-protocols-from-api-version-1-to-version-2).

We’ve also published a [more in\-depth discussion](http://support.opentrons.com/en/articles/3418212-opentrons-protocol-api-version-2) of why we developed version 2 of the API and how it differs from version 1\.

## Labware

Labware are the durable or consumable items that you work with, reuse, or discard while running a protocol on a Flex or OT\-2\. Items such as pipette tips, well plates, tubes, and reservoirs are all examples of labware. This section provides a brief overview of default labware, custom labware, and how to use basic labware API methods when creating a protocol for your robot.

Note

Code snippets use coordinate deck slot locations (e.g. `"D1"`, `"D2"`), like those found on Flex. If you have an OT\-2 and are using API version 2\.14 or earlier, replace the coordinate with its numeric OT\-2 equivalent. For example, slot D1 on Flex corresponds to slot 1 on an OT\-2\. See [Deck Slots](index.html#deck-slots) for more information.

### Labware Types

#### Default Labware

Default labware is everything listed in the [Opentrons Labware Library](https://labware.opentrons.com/). When used in a protocol, your Flex or OT\-2 knows how to work with default labware. However, you must first inform the API about the labware you will place on the robot’s deck. Search the library when you’re looking for the API load names of the labware you want to use. You can copy the load names from the library and pass them to the [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') method in your protocol.

#### Custom Labware

Custom labware is labware that is not listed the Labware Library. If your protocol needs something that’s not in the library, you can create it with the [Opentrons Labware Creator](https://labware.opentrons.com/create/). However, before using the Labware Creator, you should take a moment to review the support article [Creating Custom Labware Definitions](https://support.opentrons.com/s/article/Creating-Custom-Labware-Definitions).

After you’ve created your labware, save it as a `.json` file and add it to the Opentrons App. See [Using Labware in Your Protocols](https://support.opentrons.com/s/article/Using-labware-in-your-protocols) for instructions.

If other people need to use your custom labware definition, they must also add it to their Opentrons App.

### Loading Labware

Throughout this section, we’ll use the labware listed in the following table.

| Labware type   | Labware name                                                                                        | API load name                     |
| -------------- | --------------------------------------------------------------------------------------------------- | --------------------------------- |
| Well plate     | [Corning 96 Well Plate 360 µL Flat](https://labware.opentrons.com/corning_96_wellplate_360ul_flat/) | `corning_96_wellplate_360ul_flat` |
| Flex tip rack  | [Opentrons Flex 96 Tips 200 µL](https://shop.opentrons.com/opentrons-flex-tips-200-l/)              | `opentrons_flex_96_tiprack_200ul` |
| OT\-2 tip rack | [Opentrons 96 Tip Rack 300 µL](https://labware.opentrons.com/opentrons_96_tiprack_300ul)            | `opentrons_96_tiprack_300ul`      |

Similar to the code sample in [How the API Works](index.html#overview-section-v2), here’s how you use the [`ProtocolContext.load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') method to load labware on either Flex or OT\-2\.

```
#Flex
tiprack = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D1")
plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D2")

```

```
#OT-2
tiprack = protocol.load_labware("opentrons_96_tiprack_300ul", "1")
plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "2")

```

New in version 2\.0\.

When the `load_labware` method loads labware into your protocol, it returns a [`Labware`](index.html#opentrons.protocol_api.Labware 'opentrons.protocol_api.labware.Labware') object.

Tip

The `load_labware` method includes an optional `label` argument. You can use it to identify labware with a descriptive name. If used, the label value is displayed in the Opentrons App. For example:

```
tiprack = protocol.load_labware(
    load_name="corning_96_wellplate_360ul_flat",
    location="D1",
    label="any-name-you-want")

```

#### Loading Labware on Adapters

The previous section demonstrates loading labware directly into a deck slot. But you can also load labware on top of an adapter that either fits on a module or goes directly on the deck. The ability to combine labware with adapters adds functionality and flexibility to your robot and protocols.

You can either load the adapter first and the labware second, or load both the adapter and labware all at once.

##### Loading Separately

The `load_adapter()` method is available on `ProtocolContext` and module contexts. It behaves similarly to `load_labware()`, requiring the load name and location for the desired adapter. Load a module, adapter, and labware with separate calls to specify each layer of the physical stack of components individually:

```
hs_mod = protocol.load_module("heaterShakerModuleV1", "D1")
hs_adapter = hs_mod.load_adapter("opentrons_96_flat_bottom_adapter")
hs_plate = hs_adapter.load_labware("nest_96_wellplate_200ul_flat")

```

New in version 2\.15: The `load_adapter()` method.

##### Loading Together

Use the `adapter` argument of `load_labware()` to load an adapter at the same time as labware. For example, to load the same 96\-well plate and adapter from the previous section at once:

```
hs_plate = hs_mod.load_labware(
    name="nest_96_wellplate_200ul_flat",
    adapter="opentrons_96_flat_bottom_adapter"
)

```

New in version 2\.15: The `adapter` parameter.

The API also has some “combination” labware definitions, which treat the adapter and labware as a unit:

```
hs_combo = hs_mod.load_labware(
    "opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat"
)

```

Loading labware this way prevents you from [moving the labware](index.html#moving-labware) onto or off of the adapter, so it’s less flexible than loading the two separately. Avoid using combination definitions unless your protocol specifies an `apiLevel` of 2\.14 or lower.

### Accessing Wells in Labware

#### Well Ordering

You need to select which wells to transfer liquids to and from over the course of a protocol.

Rows of wells on a labware have labels that are capital letters starting with A. For instance, an 96\-well plate has 8 rows, labeled `"A"` through `"H"`.

Columns of wells on a labware have labels that are numbers starting with 1\. For instance, a 96\-well plate has columns `"1"` through `"12"`.

All well\-accessing functions start with the well at the top left corner of the labware. The ending well is in the bottom right. The order of travel from top left to bottom right depends on which function you use.

The code in this section assumes that `plate` is a 24\-well plate. For example:

```
plate = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="D1")

```

#### Accessor Methods

The API provides many different ways to access wells inside labware. Different methods are useful in different contexts. The table below lists out the methods available to access wells and their differences.

| Method                                                                                                                                    | Returns                               | Example                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| [`Labware.wells()`](index.html#opentrons.protocol_api.Labware.wells 'opentrons.protocol_api.Labware.wells')                               | List of all wells.                    | `[labware:A1, labware:B1, labware:C1...]`                              |
| [`Labware.rows()`](index.html#opentrons.protocol_api.Labware.rows 'opentrons.protocol_api.Labware.rows')                                  | List of lists grouped by row.         | `[[labware:A1, labware:A2...], [labware:B1, labware:B2...]]`           |
| [`Labware.columns()`](index.html#opentrons.protocol_api.Labware.columns 'opentrons.protocol_api.Labware.columns')                         | List of lists grouped by column.      | `[[labware:A1, labware:B1...], [labware:A2, labware:B2...]]`           |
| [`Labware.wells_by_name()`](index.html#opentrons.protocol_api.Labware.wells_by_name 'opentrons.protocol_api.Labware.wells_by_name')       | Dictionary with well names as keys.   | `{"A1": labware:A1, "B1": labware:B1}`                                 |
| [`Labware.rows_by_name()`](index.html#opentrons.protocol_api.Labware.rows_by_name 'opentrons.protocol_api.Labware.rows_by_name')          | Dictionary with row names as keys.    | `{"A": [labware:A1, labware:A2...], "B": [labware:B1, labware:B2...]}` |
| [`Labware.columns_by_name()`](index.html#opentrons.protocol_api.Labware.columns_by_name 'opentrons.protocol_api.Labware.columns_by_name') | Dictionary with column names as keys. | `{"1": [labware:A1, labware:B1...], "2": [labware:A2, labware:B2...]}` |

#### Accessing Individual Wells

##### Dictionary Access

The simplest way to refer to a single well is by its [`well_name`](index.html#opentrons.protocol_api.Well.well_name 'opentrons.protocol_api.Well.well_name'), like A1 or D6\. Referencing a particular key in the result of [`Labware.wells_by_name()`](index.html#opentrons.protocol_api.Labware.wells_by_name 'opentrons.protocol_api.Labware.wells_by_name') accomplishes this. This is such a common task that the API also has an equivalent shortcut: dictionary indexing.

```
a1 = plate.wells_by_name()["A1"]
d6 = plate["D6"]  # dictionary indexing

```

If a well does not exist in the labware, such as `plate["H12"]` on a 24\-well plate, the API will raise a `KeyError`. In contrast, it would be a valid reference on a standard 96\-well plate.

New in version 2\.0\.

##### List Access From `wells`

In addition to referencing wells by name, you can also reference them with zero\-indexing. The first well in a labware is at position 0\.

```
plate.wells()[0]   # well A1
plate.wells()[23]  # well D6

```

Tip

You may find coordinate well names like `"B3"` easier to reason with, especially when working with irregular labware, e.g.
`opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical` (see the [Opentrons 10 Tube Rack](https://labware.opentrons.com/opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical) in the Labware Library). Whichever well access method you use, your protocol will be most maintainable if you use only one access method consistently.

New in version 2\.0\.

#### Accessing Groups of Wells

When handling liquid, you can provide a group of wells as the source or destination. Alternatively, you can take a group of wells and loop (or iterate) through them, with each liquid\-handling command inside the loop accessing the loop index.

Use [`Labware.rows_by_name()`](index.html#opentrons.protocol_api.Labware.rows_by_name 'opentrons.protocol_api.Labware.rows_by_name') to access a specific row of wells or [`Labware.columns_by_name()`](index.html#opentrons.protocol_api.Labware.columns_by_name 'opentrons.protocol_api.Labware.columns_by_name') to access a specific column of wells on a labware. These methods both return a dictionary with the row or column name as the keys:

```
row_dict = plate.rows_by_name()["A"]
row_list = plate.rows()[0]  # equivalent to the line above
column_dict = plate.columns_by_name()["1"]
column_list = plate.columns()[0]  # equivalent to the line above

print('Column "1" has', len(column_dict), 'wells')  # Column "1" has 4 wells
print('Row "A" has', len(row_dict), 'wells')  # Row "A" has 6 wells

```

Since these methods return either lists or dictionaries, you can iterate through them as you would regular Python data structures.

For example, to transfer 50 µL of liquid from the first well of a reservoir to each of the wells of row `"A"` on a plate:

```
for well in plate.rows()[0]:
    pipette.transfer(reservoir["A1"], well, 50)

```

Equivalently, using `rows_by_name`:

```
for well in plate.rows_by_name()["A"].values():
    pipette.transfer(reservoir["A1"], well, 50)

```

New in version 2\.0\.

### Labeling Liquids in Wells

Optionally, you can specify the liquids that should be in various wells at the beginning of your protocol. Doing so helps you identify well contents by name and volume, and adds corresponding labels to a single well, or group of wells, in well plates and reservoirs. You can view the initial liquid setup:

- For Flex protocols, on the touchscreen.
- For Flex or OT\-2 protocols, in the Opentrons App (v6\.3\.0 or higher).

To use these optional methods, first create a liquid object with [`ProtocolContext.define_liquid()`](index.html#opentrons.protocol_api.ProtocolContext.define_liquid 'opentrons.protocol_api.ProtocolContext.define_liquid') and then label individual wells by calling [`Well.load_liquid()`](index.html#opentrons.protocol_api.Well.load_liquid 'opentrons.protocol_api.Well.load_liquid').

Let’s examine how these two methods work. The following examples demonstrate how to define colored water samples for a well plate and reservoir.

#### Defining Liquids

This example uses `define_liquid` to create two liquid objects and instantiates them with the variables `greenWater` and `blueWater`, respectively. The arguments for `define_liquid` are all required, and let you name the liquid, describe it, and assign it a color:

```
greenWater = protocol.define_liquid(
    name="Green water",
    description="Green colored water for demo",
    display_color="#00FF00",
)
blueWater = protocol.define_liquid(
    name="Blue water",
    description="Blue colored water for demo",
    display_color="#0000FF",
)

```

New in version 2\.14\.

The `display_color` parameter accepts a hex color code, which adds a color to that liquid’s label when you import your protocol into the Opentrons App. The `define_liquid` method accepts standard 3\-, 4\-, 6\-, and 8\-character hex color codes.

#### Labeling Wells and Reservoirs

This example uses `load_liquid` to label the initial well location, contents, and volume (in µL) for the liquid objects created by `define_liquid`. Notice how values of the `liquid` argument use the variable names `greenWater` and `blueWater` (defined above) to associate each well with a particular liquid:

```
well_plate["A1"].load_liquid(liquid=greenWater, volume=50)
well_plate["A2"].load_liquid(liquid=greenWater, volume=50)
well_plate["B1"].load_liquid(liquid=blueWater, volume=50)
well_plate["B2"].load_liquid(liquid=blueWater, volume=50)
reservoir["A1"].load_liquid(liquid=greenWater, volume=200)
reservoir["A2"].load_liquid(liquid=blueWater, volume=200)

```

New in version 2\.14\.

This information is available after you import your protocol to the app or send it to Flex. A summary of liquids appears on the protocol detail page, and well\-by\-well detail is available on the run setup page (under Initial Liquid Setup in the app, or under Liquids on Flex).

Note

`load_liquid` does not validate volume for your labware nor does it prevent you from adding multiple liquids to each well. For example, you could label a 40 µL well with `greenWater`, `volume=50`, and then also add blue water to the well. The API won’t stop you. It’s your responsibility to ensure the labels you use accurately reflect the amounts and types of liquid you plan to place into wells and reservoirs.

#### Labeling vs Handling Liquids

The `load_liquid` arguments include a volume amount (`volume=n` in µL). This amount is just a label. It isn’t a command or function that manipulates liquids. It only tells you how much liquid should be in a well at the start of the protocol. You need to use a method like [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') to physically move liquids from a source to a destination.

### Well Dimensions

The functions in the [Accessing Wells in Labware](#new-well-access) section above return a single [`Well`](index.html#opentrons.protocol_api.Well 'opentrons.protocol_api.Well') object or a larger object representing many wells. [`Well`](index.html#opentrons.protocol_api.Well 'opentrons.protocol_api.Well') objects have attributes that provide information about their physical shape, such as the depth or diameter, as specified in their corresponding labware definition. These properties can be used for different applications, such as calculating the volume of a well or a [position relative to the well](index.html#position-relative-labware).

#### Depth

Use [`Well.depth`](index.html#opentrons.protocol_api.Well.depth 'opentrons.protocol_api.Well.depth') to get the distance in mm between the very top of the well and the very bottom. For example, a conical well’s depth is measured from the top center to the bottom center of the well.

```
plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D1")
depth = plate["A1"].depth  # 10.67

```

#### Diameter

Use [`Well.diameter`](index.html#opentrons.protocol_api.Well.diameter 'opentrons.protocol_api.Well.diameter') to get the diameter of a given well in mm. Since diameter is a circular measurement, this attribute is only present on labware with circular wells. If the well is not circular, the value will be `None`. Use length and width (see below) for non\-circular wells.

```
plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "D1")
diameter = plate["A1"].diameter      # 6.86

```

#### Length

Use [`Well.length`](index.html#opentrons.protocol_api.Well.length 'opentrons.protocol_api.Well.length') to get the length of a given well in mm. Length is defined as the distance along the robot’s x\-axis (left to right). This attribute is only present on rectangular wells. If the well is not rectangular, the value will be `None`. Use diameter (see above) for circular wells.

```
plate = protocol.load_labware("nest_12_reservoir_15ml", "D1")
length = plate["A1"].length  # 8.2

```

#### Width

Use [`Well.width`](index.html#opentrons.protocol_api.Well.width 'opentrons.protocol_api.Well.width') to get the width of a given well in mm. Width is defined as the distance along the y\-axis (front to back). This attribute is only present on rectangular wells. If the well is not rectangular, the value will be `None`. Use diameter (see above) for circular wells.

```
plate = protocol.load_labware("nest_12_reservoir_15ml", "D1")
width = plate["A1"].width  # 71.2

```

New in version 2\.9\.

## Moving Labware

You can move an entire labware (and all of its contents) from one deck slot to another at any point during your protocol. On Flex, you can either use the gripper or move the labware manually. On OT\-2, you can can only move labware manually, since it doesn’t have a gripper instrument.

### Basic Movement

Use the [`ProtocolContext.move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') method to initiate a move, regardless of whether it uses the gripper.

```
def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D1")
    protocol.move_labware(labware=plate, new_location="D2")

```

New in version 2\.15\.

The required arguments of `move_labware()` are the `labware` you want to move and its `new_location`. You don’t need to specify where the move begins, since that information is already stored in the [`Labware`](index.html#opentrons.protocol_api.Labware 'opentrons.protocol_api.labware.Labware') object — `plate` in this example. The destination of the move can be any empty deck slot, or a module that’s ready to have labware added to it (see [Movement with Modules](#movement-modules) below). Movement to an occupied location, including the labware’s current location, will raise an error.

When the move step is complete, the API updates the labware’s location, so you can move the plate multiple times:

```
protocol.move_labware(labware=plate, new_location="D2")
protocol.move_labware(labware=plate, new_location="D3")

```

For the first move, the API knows to find the plate in its initial load location, slot D1\. For the second move, the API knows to find the plate in D2\.

### Automatic vs Manual Moves

There are two ways to move labware:

- Automatically, with the Opentrons Flex Gripper.
- Manually, by pausing the protocol until a user confirms that they’ve moved the labware.

The `use_gripper` parameter of [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') determines whether a movement is automatic or manual. Set its value to `True` for an automatic move. The default value is `False`, so if you don’t specify a value, the protocol will pause for a manual move.

```
def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D1")

    # have the gripper move the plate from D1 to D2
    protocol.move_labware(labware=plate, new_location="D2", use_gripper=True)

    # pause to move the plate manually from D2 to D3
    protocol.move_labware(labware=plate, new_location="D3", use_gripper=False)

    # pause to move the plate manually from D3 to C1
    protocol.move_labware(labware=plate, new_location="C1")

```

New in version 2\.15\.

Note

Don’t add a `pause()` command before `move_labware()`. When `use_gripper` is unset or `False`, the protocol pauses when it reaches the movement step. The Opentrons App or the touchscreen on Flex shows an animation of the labware movement that you need to perform manually. The protocol only resumes when you press **Confirm and resume**.

The above example is a complete and valid `run()` function. You don’t have to load the gripper as an instrument, and there is no `InstrumentContext` for the gripper. All you have to do to specify that a protocol requires the gripper is to include at least one `move_labware()` command with `use_gripper=True`.

If you attempt to use the gripper to move labware in an OT\-2 protocol, the API will raise an error.

### Supported Labware

You can manually move any standard or custom labware. Using the gripper to move the following labware is fully supported by Opentrons:

| Labware Type                | API Load Names                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full\-skirt PCR plates      | _ `armadillo_96_wellplate_200ul_pcr_full_skirt` _ `opentrons_96_wellplate_200ul_pcr_full_skirt`                                                                                                                                           |
| NEST well plates            | _ `nest_96_wellplate_200ul_flat` _ `nest_96_wellplate_2ml_deep`                                                                                                                                                                           |
| Opentrons Flex 96 Tip Racks | _ `opentrons_flex_96_tiprack_50ul` _ `opentrons_flex_96_tiprack_200ul` _ `opentrons_flex_96_tiprack_1000ul` _ `opentrons_flex_96_filtertiprack_50ul` _ `opentrons_flex_96_filtertiprack_200ul` _ `opentrons_flex_96_filtertiprack_1000ul` |

The gripper may work with other ANSI/SLAS standard labware, but this is not recommended.

Note

The labware definitions listed above include information about the position and force that the gripper uses to pick up the labware. The gripper uses default values for labware definitions that don’t include position and force information. The Python Protocol API won’t raise a warning or error if you try to grip and move other types of labware.

### Movement with Modules

Moving labware on and off of modules lets you precisely control when the labware is in contact with the hot, cold, or magnetic surfaces of the modules — all within a single protocol.

When moving labware anywhere that isn’t an empty deck slot, consider what physical object the labware will rest on following the move. That object should be the value of `new_location`, and you need to make sure it’s already loaded before the move. For example, if you want to move a 96\-well flat plate onto a Heater\-Shaker module, you actually want to have it rest on top of the Heater\-Shaker’s 96 Flat Bottom Adapter. Pass the adapter, not the module or the slot, as the value of `new_location`:

```
def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware("nest_96_wellplate_200ul_flat", "D1")
    hs_mod = protocol.load_module("heaterShakerModuleV1", "C1")
    hs_adapter = hs_mod.load_adapter("opentrons_96_flat_bottom_adapter")
    hs_mod.open_labware_latch()
    protocol.move_labware(
        labware=plate, new_location=hs_adapter, use_gripper=True
    )

```

New in version 2\.15\.

If you try to move the plate to slot C1 or the Heater\-Shaker module, the API will raise an error, because C1 is occupied by the Heater\-Shaker, and the Heater\-Shaker is occupied by the adapter. Only the adapter, as the topmost item in that stack, is unoccupied.

Also note the `hs_mod.open_labware_latch()` command in the above example. To move labware onto or off of a module, you have to make sure that it’s physically accessible:

> - For the Heater\-Shaker, use [`open_labware_latch()`](index.html#opentrons.protocol_api.HeaterShakerContext.open_labware_latch 'opentrons.protocol_api.HeaterShakerContext.open_labware_latch').
> - For the Thermocycler, use [`open_lid()`](index.html#opentrons.protocol_api.ThermocyclerContext.open_lid 'opentrons.protocol_api.ThermocyclerContext.open_lid').

If the labware is inaccessible, the API will raise an error.

### Movement into the Waste Chute

Move used tip racks and well plates to the waste chute to dispose of them. This requires you to first [configure the waste chute](index.html#configure-waste-chute) in your protocol. Then use the loaded [`WasteChute`](index.html#opentrons.protocol_api.WasteChute 'opentrons.protocol_api.WasteChute') object as the value of `new_location`:

```
chute = protocol.load_waste_chute()
protocol.move_labware(
    labware=plate, new_location=chute, use_gripper=True
)

```

New in version 2\.16\.

This will pick up `plate` from its current location and drop it into the chute.

Always specify `use_gripper=True` when moving labware into the waste chute. The chute is not designed for manual movement. You can still manually move labware to other locations, including off\-deck, with the chute installed.

### The Off\-Deck Location

In addition to moving labware around the deck, [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') can also prompt you to move labware off of or onto the deck.

Remove labware from the deck to perform tasks like retrieving samples or discarding a spent tip rack. The destination location for such moves is the special constant [`OFF_DECK`](index.html#opentrons.protocol_api.OFF_DECK 'opentrons.protocol_api.OFF_DECK'):

```
protocol.move_labware(labware=plate, new_location=protocol_api.OFF_DECK)

```

New in version 2\.15\.

Moving labware off\-deck always requires user intervention, because the gripper can’t reach outside of the robot. Omit the `use_gripper` parameter or explicitly set it to `False`. If you try to move labware off\-deck with `use_gripper=True`, the API will raise an error.

You can also load labware off\-deck, in preparation for a `move_labware()` command that brings it _onto_ the deck. For example, you could assign two tip racks to a pipette — one on\-deck, and one off\-deck — and then swap out the first rack for the second one:

> ```
> from opentrons import protocol_api
>
> metadata = {"apiLevel": "2.19", "protocolName": "Tip rack replacement"}
> requirements = {"robotType": "OT-2"}
>
>
> def run(protocol: protocol_api.ProtocolContext):
>     tips1 = protocol.load_labware("opentrons_96_tiprack_1000ul", 1)
>     # load another tip rack but don't put it in a slot yet
>     tips2 = protocol.load_labware(
>         "opentrons_96_tiprack_1000ul", protocol_api.OFF_DECK
>     )
>     pipette = protocol.load_instrument(
>         "p1000_single_gen2", "left", tip_racks=[tips1, tips2]
>     )
>     # use all the on-deck tips
>     for i in range(96):
>         pipette.pick_up_tip()
>         pipette.drop_tip()
>     # pause to move the spent tip rack off-deck
>     protocol.move_labware(labware=tips1, new_location=protocol_api.OFF_DECK)
>     # pause to move the fresh tip rack on-deck
>     protocol.move_labware(labware=tips2, new_location=1)
>     pipette.pick_up_tip()
>
> ```

Using the off\-deck location to remove or replace labware lets you continue your workflow in a single protocol, rather than needing to end a protocol, reset the deck, and start a new protocol run.

## Hardware Modules

### Module Setup

#### Loading Modules onto the Deck

Similar to labware and pipettes, you must inform the API about the modules you want to use in your protocol. Even if you don’t use the module anywhere else in your protocol, the Opentrons App and the robot won’t let you start the protocol run until all loaded modules that use power are connected via USB and turned on.

Use [`ProtocolContext.load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') to load a module.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Load a Heater-Shaker Module GEN1 in deck slot D1.
    heater_shaker = protocol.load_module(
      module_name="heaterShakerModuleV1", location="D1")

    # Load a Temperature Module GEN2 in deck slot D3.
    temperature_module = protocol.load_module(
      module_name="temperature module gen2", location="D3")

```

After the `load_module()` method loads the modules into your protocol, it returns the [`HeaterShakerContext`](index.html#opentrons.protocol_api.HeaterShakerContext 'opentrons.protocol_api.HeaterShakerContext') and [`TemperatureModuleContext`](index.html#opentrons.protocol_api.TemperatureModuleContext 'opentrons.protocol_api.TemperatureModuleContext') objects.

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Load a Magnetic Module GEN2 in deck slot 1.
    magnetic_module = protocol.load_module(
      module_name="magnetic module gen2", location=1)

    # Load a Temperature Module GEN1 in deck slot 3.
    temperature_module = protocol.load_module(
      module_name="temperature module", location=3)

```

After the `load_module()` method loads the modules into your protocol, it returns the [`MagneticModuleContext`](index.html#opentrons.protocol_api.MagneticModuleContext 'opentrons.protocol_api.MagneticModuleContext') and [`TemperatureModuleContext`](index.html#opentrons.protocol_api.TemperatureModuleContext 'opentrons.protocol_api.TemperatureModuleContext') objects.

New in version 2\.0\.

##### Available Modules

The first parameter of [`ProtocolContext.load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') is the module’s _API load name_. The load name tells your robot which module you’re going to use in a protocol. The table below lists the API load names for the currently available modules.

| Module                     | API Load Name                                        | Introduced in API Version |
| -------------------------- | ---------------------------------------------------- | ------------------------- |
| Temperature Module GEN1    | `temperature module` or `tempdeck`                   | 2\.0                      |
| Temperature Module GEN2    | `temperature module gen2`                            | 2\.3                      |
| Magnetic Module GEN1       | `magnetic module` or `magdeck`                       | 2\.0                      |
| Magnetic Module GEN2       | `magnetic module gen2`                               | 2\.3                      |
| Thermocycler Module GEN1   | `thermocycler module` or `thermocycler`              | 2\.0                      |
| Thermocycler Module GEN2   | `thermocycler module gen2` or `thermocyclerModuleV2` | 2\.13                     |
| Heater\-Shaker Module GEN1 | `heaterShakerModuleV1`                               | 2\.13                     |
| Magnetic Block GEN1        | `magneticBlockV1`                                    | 2\.15                     |

Some modules were added to our Python API later than others, and others span multiple hardware generations. When writing a protocol that requires a module, make sure your `requirements` or `metadata` code block specifies an [API version](index.html#v2-versioning) high enough to support all the module generations you want to use.

#### Loading Labware onto a Module

Use the `load_labware()` method on the module context to load labware on a module. For example, to load the [Opentrons 24 Well Aluminum Block](https://labware.opentrons.com/opentrons_24_aluminumblock_generic_2ml_screwcap?category=aluminumBlock) on top of a Temperature Module:

```
def run(protocol: protocol_api.ProtocolContext):
    temp_mod = protocol.load_module(
      module_name="temperature module gen2",
      location="D1")
    temp_labware = temp_mod.load_labware(
        name="opentrons_24_aluminumblock_generic_2ml_screwcap",
        label="Temperature-Controlled Tubes")

```

New in version 2\.0\.

When you load labware on a module, you don’t need to specify the deck slot. In the above example, the `load_module()` method already specifies where the module is on the deck: `location= "D1"`.

Any [custom labware](index.html#v2-custom-labware) added to your Opentrons App is also accessible when loading labware onto a module. You can find and copy its load name by going to its card on the Labware page.

New in version 2\.1\.

##### Module and Labware Compatibility

It’s your responsibility to ensure the labware and module combinations you load together work together. The Protocol API won’t raise a warning or error if you load an unusual combination, like placing a tube rack on a Thermocycler. See [What labware can I use with my modules?](https://support.opentrons.com/s/article/What-labware-can-I-use-with-my-modules) for more information about labware/module combinations.

##### Additional Labware Parameters

In addition to the mandatory `load_name` argument, you can also specify additional parameters. For example, if you specify a `label`, this name will appear in the Opentrons App and the run log instead of the load name. For labware that has multiple definitions, you can specify `version` and `namespace` (though most of the time you won’t have to). The [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') methods of all module contexts accept these additional parameters.

### Heater\-Shaker Module

The Heater\-Shaker Module provides on\-deck heating and orbital shaking. The module can heat from 37 to 95 °C, and can shake samples from 200 to 3000 rpm.

The Heater\-Shaker Module is represented in code by a [`HeaterShakerContext`](index.html#opentrons.protocol_api.HeaterShakerContext 'opentrons.protocol_api.HeaterShakerContext') object. For example:

```
hs_mod = protocol.load_module(
    module_name="heaterShakerModuleV1", location="D1"
)

```

New in version 2\.13\.

#### Deck Slots

The supported deck slot positions for the Heater\-Shaker depend on the robot you’re using.

| Robot Model | Heater\-Shaker Deck Placement                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Flex        | In any deck slot in column 1 or 3\. The module can go in slot A3, but you need to move the trash bin first. |
| OT\-2       | In deck slot 1, 3, 4, 6, 7, or 10\.                                                                         |

#### OT\-2 Placement Restrictions

On OT\-2, you need to restrict placement of other modules and labware around the Heater\-Shaker. On Flex, the module is installed below\-deck in a caddy and there is more space between deck slots, so these restrictions don’t apply.

In general, it’s best to leave all slots adjacent to the Heater\-Shaker empty. If your protocol requires filling those slots, observe the following restrictions to avoid physical crashes involving the Heater\-Shaker.

##### Adjacent Modules

Do not place other modules next to the Heater\-Shaker. Keeping adjacent deck slots clear helps prevents collisions during shaking and while opening the labware latch. Loading a module next to the Heater\-Shaker on OT\-2 will raise a `DeckConflictError`.

##### Tall Labware

Do not place labware taller than 53 mm to the left or right of the Heater\-Shaker. This prevents the Heater\-Shaker’s latch from colliding with the adjacent labware. Common labware that exceed the height limit include Opentrons tube racks and Opentrons 1000 µL tip racks. Loading tall labware to the right or left of the Heater\-Shaker on OT\-2 will raise a `DeckConflictError`.

##### 8\-Channel Pipettes

You can’t perform pipetting actions in any slots adjacent to the Heater\-Shaker if you’re using a GEN2 or GEN1 8\-channel pipette. This prevents the pipette ejector from crashing on the module housing or labware latch. Using an 8\-channel pipette will raise a `PipetteMovementRestrictedByHeaterShakerError`.

There is one exception: to the front or back of the Heater\-Shaker, an 8\-channel pipette can access tip racks only. Attempting to pipette to non\-tip\-rack labware will also raise a `PipetteMovementRestrictedByHeaterShakerError`.

#### Latch Control

To add and remove labware from the Heater\-Shaker, control the module’s labware latch from your protocol using [`open_labware_latch()`](index.html#opentrons.protocol_api.HeaterShakerContext.open_labware_latch 'opentrons.protocol_api.HeaterShakerContext.open_labware_latch') and [`close_labware_latch()`](index.html#opentrons.protocol_api.HeaterShakerContext.close_labware_latch 'opentrons.protocol_api.HeaterShakerContext.close_labware_latch'). Shaking requires the labware latch to be closed, so you may want to issue a close command before the first shake command in your protocol:

```
hs_mod.close_labware_latch()
hs_mod.set_and_wait_for_shake_speed(500)

```

If the labware latch is already closed, `close_labware_latch()` will succeed immediately; you don’t have to check the status of the latch before opening or closing it.

To prepare the deck before running a protocol, use the labware latch controls in the Opentrons App or run these methods in Jupyter notebook.

#### Loading Labware

Use the Heater\-Shaker’s [`load_adapter()`](index.html#opentrons.protocol_api.HeaterShakerContext.load_adapter 'opentrons.protocol_api.HeaterShakerContext.load_adapter') and [`load_labware()`](index.html#opentrons.protocol_api.HeaterShakerContext.load_labware 'opentrons.protocol_api.HeaterShakerContext.load_labware') methods to specify what you will place on the module. For the Heater\-Shaker, use one of the thermal adapters listed below and labware that fits on the adapter. See [Loading Labware on Adapters](index.html#labware-on-adapters) for examples of loading labware on modules.

The [Opentrons Labware Library](https://labware.opentrons.com/) includes definitions for both standalone adapters and adapter–labware combinations. These labware definitions help make the Heater\-Shaker ready to use right out of the box.

Note

If you plan to [move labware](index.html#moving-labware) onto or off of the Heater\-Shaker during your protocol, you must use a standalone adapter definition, not an adapter–labware combination definiton.

##### Standalone Adapters

You can use these standalone adapter definitions to load Opentrons verified or custom labware on top of the Heater\-Shaker.

| Adapter Type                                    | API Load Name                      |
| ----------------------------------------------- | ---------------------------------- |
| Opentrons Universal Flat Heater\-Shaker Adapter | `opentrons_universal_flat_adapter` |
| Opentrons 96 PCR Heater\-Shaker Adapter         | `opentrons_96_pcr_adapter`         |
| Opentrons 96 Deep Well Heater\-Shaker Adapter   | `opentrons_96_deep_well_adapter`   |
| Opentrons 96 Flat Bottom Heater\-Shaker Adapter | `opentrons_96_flat_bottom_adapter` |

For example, these commands load a well plate on top of the flat bottom adapter:

```
hs_adapter = hs_mod.load_adapter("opentrons_96_flat_bottom_adapter")
hs_plate = hs_adapter.load_labware("nest_96_wellplate_200ul_flat")

```

New in version 2\.15: The `load_adapter()` method.

##### Pre\-configured Combinations

The Heater\-Shaker supports these thermal adapter and labware combinations for backwards compatibility. If your protocol specifies an `apiLevel` of 2\.15 or higher, you should use the standalone adapter definitions instead.

| Adapter/Labware Combination                                              | API Load Name                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Opentrons 96 Deep Well Adapter with NEST Deep Well Plate 2 mL            | `opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep`            |
| Opentrons 96 Flat Bottom Adapter with NEST 96 Well Plate 200 µL Flat     | `opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat`        |
| Opentrons 96 PCR Adapter with Armadillo Well Plate 200 µL                | `opentrons_96_pcr_adapter_armadillo_wellplate_200ul`                |
| Opentrons 96 PCR Adapter with NEST Well Plate 100 µL                     | `opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt`      |
| Opentrons Universal Flat Adapter with Corning 384 Well Plate 112 µL Flat | `opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat` |

This command loads the same physical adapter and labware as the example in the previous section, but it is also compatible with API versions 2\.13 and 2\.14:

```
hs_combo = hs_mod.load_labware(
    "opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat"
)

```

New in version 2\.13\.

##### Custom Flat\-Bottom Labware

Custom flat\-bottom labware can be used with the Universal Flat Adapter. See the support article [Requesting a Custom Labware Definition](https://support.opentrons.com/s/article/Requesting-a-custom-labware-definition) if you need assistance creating custom labware definitions for the Heater\-Shaker.

#### Heating and Shaking

The API treats heating and shaking as separate, independent activities due to the amount of time they take.

Increasing or reducing shaking speed takes a few seconds, so the API treats these actions as _blocking_ commands. All other commands cannot run until the module reaches the required speed.

Heating the module, or letting it passively cool, takes more time than changing the shaking speed. As a result, the API gives you the flexibility to perform other pipetting actions while waiting for the module to reach a target temperature. When holding at temperature, you can design your protocol to run in a blocking or non\-blocking manner.

Note

Since API version 2\.13, only the Heater\-Shaker Module supports non\-blocking command execution. All other modules’ methods are blocking commands.

##### Blocking commands

This example uses a blocking command and shakes a sample for one minute. No other commands will execute until a minute has elapsed. The three commands in this example start the shake, wait for one minute, and then stop the shake:

```
hs_mod.set_and_wait_for_shake_speed(500)
protocol.delay(minutes=1)
hs_mod.deactivate_shaker()

```

These actions will take about 65 seconds total. Compare this with similar\-looking commands for holding a sample at a temperature for one minute:

```
hs_mod.set_and_wait_for_temperature(75)
protocol.delay(minutes=1)
hs_mod.deactivate_heater()

```

This may take much longer, depending on the thermal block used, the volume and type of liquid contained in the labware, and the initial temperature of the module.

##### Non\-blocking commands

To pipette while the Heater\-Shaker is heating, use [`set_target_temperature()`](index.html#opentrons.protocol_api.HeaterShakerContext.set_target_temperature 'opentrons.protocol_api.HeaterShakerContext.set_target_temperature') and [`wait_for_temperature()`](index.html#opentrons.protocol_api.HeaterShakerContext.wait_for_temperature 'opentrons.protocol_api.HeaterShakerContext.wait_for_temperature') instead of [`set_and_wait_for_temperature()`](index.html#opentrons.protocol_api.HeaterShakerContext.set_and_wait_for_temperature 'opentrons.protocol_api.HeaterShakerContext.set_and_wait_for_temperature'):

```
hs_mod.set_target_temperature(75)
pipette.pick_up_tip()
pipette.aspirate(50, plate["A1"])
pipette.dispense(50, plate["B1"])
pipette.drop_tip()
hs_mod.wait_for_temperature()
protocol.delay(minutes=1)
hs_mod.deactivate_heater()

```

This example would likely take just as long as the blocking version above; it’s unlikely that one aspirate and one dispense action would take longer than the time for the module to heat. However, be careful when putting a lot of commands between a `set_target_temperature()` call and a `delay()` call. In this situation, you’re relying on `wait_for_temperature()` to resume execution of commands once heating is complete. But if the temperature has already been reached, the delay will begin later than expected and the Heater\-Shaker will hold at its target temperature longer than intended.

Additionally, if you want to pipette while the module holds a temperature for a certain length of time, you need to track the holding time yourself. One of the simplest ways to do this is with Python’s `time` module. First, add `import time` at the start of your protocol. Then, use [`time.monotonic()`](https://docs.python.org/3/library/time.html#time.monotonic '(in Python v3.12)') to set a reference time when the target is reached. Finally, add a delay that calculates how much holding time is remaining after the pipetting actions:

```
hs_mod.set_and_wait_for_temperature(75)
start_time = time.monotonic()  # set reference time
pipette.pick_up_tip()
pipette.aspirate(50, plate["A1"])
pipette.dispense(50, plate["B1"])
pipette.drop_tip()
# delay for the difference between now and 60 seconds after the reference time
protocol.delay(max(0, start_time+60 - time.monotonic()))
hs_mod.deactivate_heater()

```

Provided that the parallel pipetting actions don’t take more than one minute, this code will deactivate the heater one minute after its target was reached. If more than one minute has elapsed, the value passed to `protocol.delay()` will equal 0, and the protocol will continue immediately.

#### Deactivating

Deactivating the heater and shaker are done separately using the [`deactivate_heater()`](index.html#opentrons.protocol_api.HeaterShakerContext.deactivate_heater 'opentrons.protocol_api.HeaterShakerContext.deactivate_heater') and [`deactivate_shaker()`](index.html#opentrons.protocol_api.HeaterShakerContext.deactivate_shaker 'opentrons.protocol_api.HeaterShakerContext.deactivate_shaker') methods, respectively. There is no method to deactivate both simultaneously. Call the two methods in sequence if you need to stop both heating and shaking.

Note

The robot will not automatically deactivate the Heater\-Shaker at the end of a protocol. If you need to deactivate the module after a protocol is completed or canceled, use the Heater\-Shaker module controls on the device detail page in the Opentrons App or run these methods in Jupyter notebook.

### Magnetic Block

Note

The Magnetic Block is compatible with Opentrons Flex only. If you have an OT\-2, use the [Magnetic Module](index.html#magnetic-module).

The Magnetic Block is an unpowered, 96\-well plate that holds labware close to its high\-strength neodymium magnets. This module is suitable for many magnetic bead\-based protocols, but does not move beads up or down in solution.

Because the Magnetic Block is unpowered, neither your robot nor the Opentrons App aware of this module. You “control” it via protocols to load labware onto the module and use the Opentrons Flex Gripper to move labware on and off the module. See [Moving Labware](index.html#moving-labware) for more information.

The Magnetic Block is represented by a [`MagneticBlockContext`](index.html#opentrons.protocol_api.MagneticBlockContext 'opentrons.protocol_api.MagneticBlockContext') object which lets you load labware on top of the module.

```
# Load the Magnetic Block in deck slot D1
magnetic_block = protocol.load_module(
    module_name="magneticBlockV1", location="D1"
)

# Load a 96-well plate on the magnetic block
mag_plate = magnetic_block.load_labware(
    name="biorad_96_wellplate_200ul_pcr"
)

# Use the Gripper to move labware
protocol.move_labware(mag_plate, new_location="B2", use_gripper=True)

```

New in version 2\.15\.

### Magnetic Module

Note

The Magnetic Module is compatible with the OT\-2 only. If you have a Flex, use the [Magnetic Block](index.html#magnetic-block).

The Magnetic Module controls a set of permanent magnets which can move vertically to induce a magnetic field in the labware loaded on the module.

The Magnetic Module is represented by a [`MagneticModuleContext`](index.html#opentrons.protocol_api.MagneticModuleContext 'opentrons.protocol_api.MagneticModuleContext') object, which has methods for engaging (raising) and disengaging (lowering) its magnets.

The examples in this section apply to an OT\-2 with a Magnetic Module GEN2 loaded in slot 6:

```
def run(protocol: protocol_api.ProtocolContext):
    mag_mod = protocol.load_module(
      module_name="magnetic module gen2",
      location="6")
    plate = mag_mod.load_labware(
      name="nest_96_wellplate_100ul_pcr_full_skirt")

```

New in version 2\.3\.

#### Loading Labware

Like with all modules, use the Magnetic Module’s [`load_labware()`](index.html#opentrons.protocol_api.MagneticModuleContext.load_labware 'opentrons.protocol_api.MagneticModuleContext.load_labware') method to specify what you will place on the module. The Magnetic Module supports 96\-well PCR plates and deep well plates. For the best compatibility, use a labware definition that specifies how far the magnets should move when engaging with the labware. The following plates in the [Opentrons Labware Library](https://labware.opentrons.com/) include this measurement:

| Labware Name                                 | API Load Name                              |
| -------------------------------------------- | ------------------------------------------ |
| Bio\-Rad 96 Well Plate 200 µL PCR            | `biorad_96_wellplate_200ul_pcr`            |
| NEST 96 Well Plate 100 µL PCR Full Skirt     | `nest_96_wellplate_100ul_pcr_full_skirt`   |
| NEST 96 Deep Well Plate 2mL                  | `nest_96_wellplate_2ml_deep`               |
| Thermo Scientific Nunc 96 Well Plate 1300 µL | `thermoscientificnunc_96_wellplate_1300ul` |
| Thermo Scientific Nunc 96 Well Plate 2000 µL | `thermoscientificnunc_96_wellplate_2000ul` |
| USA Scientific 96 Deep Well Plate 2\.4 mL    | `usascientific_96_wellplate_2.4ml_deep`    |

To check whether a custom labware definition specifies this measurement, load the labware and query its [`magdeck_engage_height`](index.html#opentrons.protocol_api.Labware.magdeck_engage_height 'opentrons.protocol_api.Labware.magdeck_engage_height') property. If has a numerical value, the labware is ready for use with the Magnetic Module.

#### Engaging and Disengaging

Raise and lower the module’s magnets with the [`engage()`](index.html#opentrons.protocol_api.MagneticModuleContext.engage 'opentrons.protocol_api.MagneticModuleContext.engage') and [`disengage()`](index.html#opentrons.protocol_api.MagneticModuleContext.disengage 'opentrons.protocol_api.MagneticModuleContext.disengage') functions, respectively.

If your loaded labware is fully compatible with the Magnetic Module, you can call `engage()` with no argument:

> ```
> mag_mod.engage()
>
> ```
>
> New in version 2\.0\.

This will move the magnets upward to the default height for the labware, which should be close to the bottom of the labware’s wells. If your loaded labware doesn’t specify a default height, this will raise an `ExceptionInProtocolError`.

For certain applications, you may want to move the magnets to a different height. The recommended way is to use the `height_from_base` parameter, which represents the distance above the base of the labware (its lowest point, where it rests on the module). Setting `height_from_base=0` should move the tops of the magnets level with the base of the labware. Alternatively, you can use the `offset` parameter, which represents the distance above _or below_ the labware’s default position (close to the bottom of its wells). Like using `engage()` with no argument, this will raise an error if there is no default height for the loaded labware.

Note

There is up to 1 mm of manufacturing variance across Magnetic Module units, so observe the exact position and adjust as necessary before running your protocol.

Here are some examples of where the magnets will move when using the different parameters in combination with the loaded NEST PCR plate, which specifies a default height of 20 mm:

> ```
> mag_mod.engage(height_from_base=13.5)  # 13.5 mm
> mag_mod.engage(offset=-2)              # 15.5 mm
>
> ```

Note that `offset` takes into account the fact that the magnets’ home position is measured as −2\.5 mm for GEN2 modules.

> New in version 2\.0\.
>
> Changed in version 2\.2: Added the `height_from_base` parameter.

When you need to retract the magnets back to their home position, call [`disengage()`](index.html#opentrons.protocol_api.MagneticModuleContext.disengage 'opentrons.protocol_api.MagneticModuleContext.disengage').

> ```
> mag_mod.disengage()  # -2.5 mm
>
> ```

New in version 2\.0\.

If at any point you need to check whether the magnets are engaged or not, use the [`status`](index.html#opentrons.protocol_api.MagneticModuleContext.status 'opentrons.protocol_api.MagneticModuleContext.status') property. This will return either the string `engaged` or `disengaged`, not the exact height of the magnets.

Note

The OT\-2 will not automatically deactivate the Magnetic Module at the end of a protocol. If you need to deactivate the module after a protocol is completed or canceled, use the Magnetic Module controls on the device detail page in the Opentrons App or run `deactivate()` in Jupyter notebook.

#### Changes with the GEN2 Magnetic Module

The GEN2 Magnetic Module uses smaller magnets than the GEN1 version. This change helps mitigate an issue with the magnets attracting beads from their retracted position, but it also takes longer for the GEN2 module to attract beads. The recommended attraction time is 5 minutes for liquid volumes up to 50 µL and 7 minutes for volumes greater than 50 µL. If your application needs additional magnetic strength to attract beads within these timeframes, use the available [Adapter Magnets](https://support.opentrons.com/s/article/Adapter-magnets).

### Temperature Module

The Temperature Module acts as both a cooling and heating device. It can control the temperature of its deck between 4 °C and 95 °C with a resolution of 1 °C.

The Temperature Module is represented in code by a [`TemperatureModuleContext`](index.html#opentrons.protocol_api.TemperatureModuleContext 'opentrons.protocol_api.TemperatureModuleContext') object, which has methods for setting target temperatures and reading the module’s status. This example demonstrates loading a Temperature Module GEN2 and loading a well plate on top of it.

```
temp_mod = protocol.load_module(
    module_name="temperature module gen2", location="D3"
)

```

New in version 2\.3\.

#### Loading Labware

Use the Temperature Module’s [`load_adapter()`](index.html#opentrons.protocol_api.TemperatureModuleContext.load_adapter 'opentrons.protocol_api.TemperatureModuleContext.load_adapter') and [`load_labware()`](index.html#opentrons.protocol_api.TemperatureModuleContext.load_labware 'opentrons.protocol_api.TemperatureModuleContext.load_labware') methods to specify what you will place on the module. You may use one or both of the methods, depending on the labware you’re using. See [Loading Labware on Adapters](index.html#labware-on-adapters) for examples of loading labware on modules.

The [Opentrons Labware Library](https://labware.opentrons.com/) includes definitions for both standalone adapters and adapter–labware combinations. These labware definitions help make the Temperature Module ready to use right out of the box.

##### Standalone Adapters

You can use these standalone adapter definitions to load Opentrons verified or custom labware on top of the Temperature Module.

| Adapter Type                         | API Load Name                          |
| ------------------------------------ | -------------------------------------- |
| Opentrons Aluminum Flat Bottom Plate | `opentrons_aluminum_flat_bottom_plate` |
| Opentrons 96 Well Aluminum Block     | `opentrons_96_well_aluminum_block`     |

For example, these commands load a PCR plate on top of the 96\-well block:

```
temp_adapter = temp_mod.load_adapter(
    "opentrons_96_well_aluminum_block"
)
temp_plate = temp_adapter.load_labware(
    "nest_96_wellplate_100ul_pcr_full_skirt"
)

```

New in version 2\.15: The `load_adapter()` method.

Note

You can also load labware directly onto the Temperature Module. In API version 2\.14 and earlier, this was the correct way to load labware on top of the flat bottom plate. In API version 2\.15 and later, you should load both the adapter and the labware with separate commands.

##### Block\-and\-tube combinations

You can use these combination labware definitions to load various types of tubes into the 24\-well thermal block on top of the Temperature Module. There is no standalone definition for the 24\-well block.

| Tube Type              | API Load Name                                     |
| ---------------------- | ------------------------------------------------- |
| Generic 2 mL screw cap | `opentrons_24_aluminumblock_generic_2ml_screwcap` |
| NEST 0\.5 mL screw cap | `opentrons_24_aluminumblock_nest_0.5ml_screwcap`  |
| NEST 1\.5 mL screw cap | `opentrons_24_aluminumblock_nest_1.5ml_screwcap`  |
| NEST 1\.5 mL snap cap  | `opentrons_24_aluminumblock_nest_1.5ml_snapcap`   |
| NEST 2 mL screw cap    | `opentrons_24_aluminumblock_nest_2ml_screwcap`    |
| NEST 2 mL snap cap     | `opentrons_24_aluminumblock_nest_2ml_snapcap`     |

For example, this command loads the 24\-well block with generic 2 mL tubes:

```
temp_tubes = temp_mod.load_labware(
    "opentrons_24_aluminumblock_generic_2ml_screwcap"
)

```

New in version 2\.0\.

##### Block\-and\-plate combinations

The Temperature Module supports these 96\-well block and labware combinations for backwards compatibility. If your protocol specifies an `apiLevel` of 2\.15 or higher, you should use the standalone 96\-well block definition instead.

| 96\-well block contents    | API Load Name                                        |
| -------------------------- | ---------------------------------------------------- |
| Bio\-Rad well plate 200 µL | `opentrons_96_aluminumblock_biorad_wellplate_200uL`  |
| Generic PCR strip 200 µL   | `opentrons_96_aluminumblock_generic_pcr_strip_200uL` |
| NEST well plate 100 µL     | `opentrons_96_aluminumblock_nest_wellplate_100uL`    |

This command loads the same physical adapter and labware as the example in the Standalone Adapters section above, but it is also compatible with earlier API versions:

```
temp_combo = temp_mod.load_labware(
    "opentrons_96_aluminumblock_nest_wellplate_100uL"
)

```

New in version 2\.0\.

#### Temperature Control

The primary function of the module is to control the temperature of its deck, using [`set_temperature()`](index.html#opentrons.protocol_api.TemperatureModuleContext.set_temperature 'opentrons.protocol_api.TemperatureModuleContext.set_temperature'), which takes one parameter: `celsius`. For example, to set the Temperature Module to 4 °C:

```
temp_mod.set_temperature(celsius=4)

```

When using `set_temperature()`, your protocol will wait until the target temperature is reached before proceeding to further commands. In other words, you can pipette to or from the Temperature Module when it is holding at a temperature or idle, but not while it is actively changing temperature. Whenever the module reaches its target temperature, it will hold the temperature until you set a different target or call [`deactivate()`](index.html#opentrons.protocol_api.TemperatureModuleContext.deactivate 'opentrons.protocol_api.TemperatureModuleContext.deactivate'), which will stop heating or cooling and will turn off the fan.

Note

Your robot will not automatically deactivate the Temperature Module at the end of a protocol. If you need to deactivate the module after a protocol is completed or canceled, use the Temperature Module controls on the device detail page in the Opentrons App or run `deactivate()` in Jupyter notebook.

New in version 2\.0\.

#### Temperature Status

If you need to confirm in software whether the Temperature Module is holding at a temperature or is idle, use the [`status`](index.html#opentrons.protocol_api.TemperatureModuleContext.status 'opentrons.protocol_api.TemperatureModuleContext.status') property:

```
temp_mod.set_temperature(celsius=90)
temp_mod.status  # "holding at target"
temp_mod.deactivate()
temp_mod.status  # "idle"

```

If you don’t need to use the status value in your code, and you have physical access to the module, you can read its status and temperature from the LED and display on the module.

New in version 2\.0\.

#### Changes with the GEN2 Temperature Module

All methods of [`TemperatureModuleContext`](index.html#opentrons.protocol_api.TemperatureModuleContext 'opentrons.protocol_api.TemperatureModuleContext') work with both the GEN1 and GEN2 Temperature Module. Physically, the GEN2 module has a plastic insulating rim around the plate, and plastic insulating shrouds designed to fit over Opentrons aluminum blocks. This mitigates an issue where the GEN1 module would have trouble cooling to very low temperatures, especially if it shared the deck with a running Thermocycler.

### Thermocycler Module

The Thermocycler Module provides on\-deck, fully automated thermocycling, and can heat and cool very quickly during operation. The module’s block can reach and maintain temperatures between 4 and 99 °C. The module’s lid can heat up to 110 °C.

The Thermocycler is represented in code by a [`ThermocyclerContext`](index.html#opentrons.protocol_api.ThermocyclerContext 'opentrons.protocol_api.ThermocyclerContext') object, which has methods for controlling the lid, controlling the block, and setting _profiles_ — timed heating and cooling routines that can be repeated automatically.

The examples in this section will use a Thermocycler Module GEN2 loaded as follows:

```
tc_mod = protocol.load_module(module_name="thermocyclerModuleV2")
plate = tc_mod.load_labware(name="nest_96_wellplate_100ul_pcr_full_skirt")

```

New in version 2\.13\.

#### Lid Control

The Thermocycler can control the position and temperature of its lid.

To change the lid position, use [`open_lid()`](index.html#opentrons.protocol_api.ThermocyclerContext.open_lid 'opentrons.protocol_api.ThermocyclerContext.open_lid') and [`close_lid()`](index.html#opentrons.protocol_api.ThermocyclerContext.close_lid 'opentrons.protocol_api.ThermocyclerContext.close_lid'). When the lid is open, the pipettes can access the loaded labware.

You can also control the temperature of the lid. Acceptable target temperatures are between 37 and 110 °C. Use [`set_lid_temperature()`](index.html#opentrons.protocol_api.ThermocyclerContext.set_lid_temperature 'opentrons.protocol_api.ThermocyclerContext.set_lid_temperature'), which takes one parameter: the target `temperature` (in degrees Celsius) as an integer. For example, to set the lid to 50 °C:

```
tc_mod.set_lid_temperature(temperature=50)

```

The protocol will only proceed once the lid temperature reaches 50 °C. This is the case whether the previous temperature was lower than 50 °C (in which case the lid will actively heat) or higher than 50 °C (in which case the lid will passively cool).

You can turn off the lid heater at any time with [`deactivate_lid()`](index.html#opentrons.protocol_api.ThermocyclerContext.deactivate_lid 'opentrons.protocol_api.ThermocyclerContext.deactivate_lid').

Note

Lid temperature is not affected by Thermocycler profiles. Therefore you should set an appropriate lid temperature to hold during your profile _before_ executing it. See [Thermocycler Profiles](#thermocycler-profiles) for more information on defining and executing profiles.

New in version 2\.0\.

#### Block Control

The Thermocycler can control its block temperature, including holding at a temperature and adjusting for the volume of liquid held in its loaded plate.

##### Temperature

To set the block temperature inside the Thermocycler, use [`set_block_temperature()`](index.html#opentrons.protocol_api.ThermocyclerContext.set_block_temperature 'opentrons.protocol_api.ThermocyclerContext.set_block_temperature'). At minimum you have to specify a `temperature` in degrees Celsius:

```
tc_mod.set_block_temperature(temperature=4)

```

If you don’t specify any other parameters, the Thermocycler will hold this temperature until a new temperature is set, [`deactivate_block()`](index.html#opentrons.protocol_api.ThermocyclerContext.deactivate_block 'opentrons.protocol_api.ThermocyclerContext.deactivate_block') is called, or the module is powered off.

New in version 2\.0\.

##### Hold Time

You can optionally instruct the Thermocycler to hold its block temperature for a specific amount of time. You can specify `hold_time_minutes`, `hold_time_seconds`, or both (in which case they will be added together). For example, this will set the block to 4 °C for 4 minutes and 15 seconds:

```
tc_mod.set_block_temperature(
    temperature=4,
    hold_time_minutes=4,
    hold_time_seconds=15)

```

Note

Your protocol will not proceed to further commands while holding at a temperature. If you don’t specify a hold time, the protocol will proceed as soon as the target temperature is reached.

New in version 2\.0\.

##### Block Max Volume

The Thermocycler’s block temperature controller varies its behavior based on the amount of liquid in the wells of its labware. Accurately specifying the liquid volume allows the Thermocycler to more precisely control the temperature of the samples. You should set the `block_max_volume` parameter to the amount of liquid in the _fullest_ well, measured in µL. If not specified, the Thermocycler will assume samples of 25 µL.

It is especially important to specify `block_max_volume` when holding at a temperature. For example, say you want to hold larger samples at a temperature for a short time:

```
tc_mod.set_block_temperature(
    temperature=4,
    hold_time_seconds=20,
    block_max_volume=80)

```

If the Thermocycler assumes these samples are 25 µL, it may not cool them to 4 °C before starting the 20\-second timer. In fact, with such a short hold time they may not reach 4 °C at all!

New in version 2\.0\.

#### Thermocycler Profiles

In addition to executing individual temperature commands, the Thermocycler can automatically cycle through a sequence of block temperatures to perform heat\-sensitive reactions. These sequences are called _profiles_, which are defined in the Protocol API as lists of dictionaries. Each dictionary within the profile should have a `temperature` key, which specifies the temperature of the step, and either or both of `hold_time_seconds` and `hold_time_minutes`, which specify the duration of the step.

For example, this profile commands the Thermocycler to reach 10 °C and hold for 30 seconds, and then to reach 60 °C and hold for 45 seconds:

```
profile = [
    {"temperature":10, "hold_time_seconds":30},
    {"temperature":60, "hold_time_seconds":45}
]

```

Once you have written the steps of your profile, execute it with [`execute_profile()`](index.html#opentrons.protocol_api.ThermocyclerContext.execute_profile 'opentrons.protocol_api.ThermocyclerContext.execute_profile'). This function executes your profile steps multiple times depending on the `repetitions` parameter. It also takes a `block_max_volume` parameter, which is the same as that of the [`set_block_temperature()`](index.html#opentrons.protocol_api.ThermocyclerContext.set_block_temperature 'opentrons.protocol_api.ThermocyclerContext.set_block_temperature') function.

For instance, a PCR prep protocol might define and execute a profile like this:

```
profile = [
    {"temperature":95, "hold_time_seconds":30},
    {"temperature":57, "hold_time_seconds":30},
    {"temperature":72, "hold_time_seconds":60}
]
tc_mod.execute_profile(steps=profile, repetitions=20, block_max_volume=32)

```

In terms of the actions that the Thermocycler performs, this would be equivalent to nesting `set_block_temperature` commands in a `for` loop:

```
for i in range(20):
    tc_mod.set_block_temperature(95, hold_time_seconds=30, block_max_volume=32)
    tc_mod.set_block_temperature(57, hold_time_seconds=30, block_max_volume=32)
    tc_mod.set_block_temperature(72, hold_time_seconds=60, block_max_volume=32)

```

However, this code would generate 60 lines in the protocol’s run log, while executing a profile is summarized in a single line. Additionally, you can set a profile once and execute it multiple times (with different numbers of repetitions and maximum volumes, if needed).

Note

Temperature profiles only control the temperature of the block in the Thermocycler. You should set a lid temperature before executing the profile using [`set_lid_temperature()`](index.html#opentrons.protocol_api.ThermocyclerContext.set_lid_temperature 'opentrons.protocol_api.ThermocyclerContext.set_lid_temperature').

New in version 2\.0\.

#### Changes with the GEN2 Thermocycler Module

All methods of [`ThermocyclerContext`](index.html#opentrons.protocol_api.ThermocyclerContext 'opentrons.protocol_api.ThermocyclerContext') work with both the GEN1 and GEN2 Thermocycler. One practical difference is that the GEN2 module has a plate lift feature to make it easier to remove the plate manually or with the Opentrons Flex Gripper. To activate the plate lift, press the button on the Thermocycler for three seconds while the lid is open. If you need to do this in the middle of a run, call [`pause()`](index.html#opentrons.protocol_api.ProtocolContext.pause 'opentrons.protocol_api.ProtocolContext.pause'), lift and move the plate, and then resume the run.

### Multiple Modules of the Same Type

You can use multiple modules of the same type within a single protocol. The exception is the Thermocycler Module, which has only one supported deck location because of its size. Running protocols with multiple modules of the same type requires version 4\.3 or newer of the Opentrons App and robot server.

When working with multiple modules of the same type, load them in your protocol according to their USB port number. Deck coordinates are required by the [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') method, but location does not determine which module loads first. Your robot will use the module with the lowest USB port number _before_ using a module of the same type that’s connected to higher numbered USB port. The USB port number (not deck location) determines module load sequence, starting with the lowest port number first.

### Flex

In this example, `temperature_module_1` loads first because it’s connected to USB port 2\. `temperature_module_2` loads next because it’s connected to USB port 6\.

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
  # Load Temperature Module 1 in deck slot D1 on USB port 2
  temperature_module_1 = protocol.load_module(
    module_name="temperature module gen2",
    location="D1")

  # Load Temperature Module 2 in deck slot C1 on USB port 6
  temperature_module_2 = protocol.load_module(
    module_name="temperature module gen2",
    location="C1")

```

The Temperature Modules are connected as shown here:

### OT-2

In this example, `temperature_module_1` loads first because it’s connected to USB port 1\. `temperature_module_2` loads next because it’s connected to USB port 3\.

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}


def run(protocol: protocol_api.ProtocolContext):
    # Load Temperature Module 1 in deck slot C1 on USB port 1
    temperature_module_1 = protocol.load_module(
        load_name="temperature module gen2", location="1"
    )

    # Load Temperature Module 2 in deck slot D3 on USB port 2
    temperature_module_2 = protocol.load_module(
        load_name="temperature module gen2", location="3"
    )

```

The Temperature Modules are connected as shown here:

Before running your protocol, it’s a good idea to use the module controls in the Opentrons App to check that commands are being sent where you expect.

See the support article [Using Modules of the Same Type](https://support.opentrons.com/s/article/Using-modules-of-the-same-type-on-the-OT-2) for more information.

Hardware modules are powered and unpowered deck\-mounted peripherals. The Flex and OT\-2 are aware of deck\-mounted powered modules when they’re attached via a USB connection and used in an uploaded protocol. The robots do not know about unpowered modules until you use one in a protocol and upload it to the Opentrons App.

Powered modules include the Heater\-Shaker Module, Magnetic Module, Temperature Module, and Thermocycler Module. The 96\-well Magnetic Block is an unpowered module.

Pages in this section of the documentation cover:

> - [Setting up modules and their labware](index.html#module-setup).
> - Working with the module contexts for each type of module.
>
> > - [Heater\-Shaker Module](index.html#heater-shaker-module)
> >   - [Magnetic Block](index.html#magnetic-block)
> >   - [Magnetic Module](index.html#magnetic-module)
> >   - [Temperature Module](index.html#temperature-module)
> >   - [Thermocycler Module](index.html#thermocycler-module)
>
> - Working with [multiple modules of the same type](index.html#moam) in a single protocol.

Note

Throughout these pages, most code examples use coordinate deck slot locations (e.g. `"D1"`, `"D2"`), like those found on Flex. If you have an OT\-2 and are using API version 2\.14 or earlier, replace the coordinate with its numeric OT\-2 equivalent. For example, slot D1 on Flex corresponds to slot 1 on an OT\-2\. See [Deck Slots](index.html#deck-slots) for more information.

## Deck Slots

Deck slots are where you place hardware items on the deck surface of your Opentrons robot. In the API, you load the corresponding items into your protocol with methods like [`ProtocolContext.load_labware`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware'), [`ProtocolContext.load_module`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module'), or [`ProtocolContext.load_trash_bin`](index.html#opentrons.protocol_api.ProtocolContext.load_trash_bin 'opentrons.protocol_api.ProtocolContext.load_trash_bin'). When you call these methods, you need to specify which slot to load the item in.

### Physical Deck Labels

Flex uses a coordinate labeling system for slots A1 (back left) through D4 (front right). Columns 1 through 3 are in the _working area_ and are accessible by pipettes and the gripper. Column 4 is in the _staging area_ and is only accessible by the gripper. For more information on staging area slots, see [Deck Configuration](#deck-configuration) below.

OT\-2 uses a numeric labeling system for slots 1 (front left) through 11 (back center). The back right slot is occupied by the fixed trash.

### API Deck Labels

The API accepts values that correspond to the physical deck slot labels on a Flex or OT\-2 robot. Specify a slot in either format:

- A coordinate like `"A1"`. This format must be a string.
- A number like `"10"` or `10`. This format can be a string or an integer.

As of API version 2\.15, the Flex and OT\-2 formats are interchangeable. You can use either format, regardless of which robot your protocol is for. You could even mix and match formats within a protocol, although this is not recommended.

For example, these two `load_labware()` commands are equivalent:

```
protocol.load_labware("nest_96_wellplate_200ul_flat", "A1")

```

New in version 2\.15\.

```
protocol.load_labware("nest_96_wellplate_200ul_flat", 10)

```

New in version 2\.0\.

Both of these commands would require you to load the well plate in the back left slot of the robot.

The correspondence between deck labels is based on the relative locations of the slots. The full list of slot equivalencies is as follows:

| Flex  | A1  | A2  | A3    | B1  | B2  | B3  | C1  | C2  | C3  | D1  | D2  | D3  |
| ----- | --- | --- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OT\-2 | 10  | 11  | Trash | 7   | 8   | 9   | 4   | 5   | 6   | 1   | 2   | 3   |

Slots A4, B4, C4, and D4 on Flex have no equivalent on OT\-2\.

### Deck Configuration

A Flex running robot system version 7\.1\.0 or higher lets you specify its deck configuration on the touchscreen or in the Opentrons App. This tells the robot the positions of unpowered _deck fixtures_: items that replace standard deck slots. The following table lists currently supported deck fixtures and their allowed deck locations.

| Fixture            | Slots         |
| ------------------ | ------------- |
| Staging area slots | A3–D3         |
| Trash bin          | A1–D1, A3\-D3 |
| Waste chute        | D3            |

Which fixtures you need to configure depend on both load methods and the effects of other methods called in your protocol. The following sections explain how to configure each type of fixture.

#### Staging Area Slots

Slots A4 through D4 are the staging area slots. Pipettes can’t reach the staging area, but these slots are always available in the API for loading and moving labware. Using a slot in column 4 as the `location` argument of [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') or the `new_location` argument of [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') will require the corresponding staging area slot in the robot’s deck configuration:

```
plate_1 = protocol.load_labware(
    load_name="corning_96_wellplate_360ul_flat", location="C3"
)  # no staging slots required
plate_2 = protocol.load_labware(
    load_name="corning_96_wellplate_360ul_flat", location="D4"
)  # one staging slot required
protocol.move_labware(
    labware=plate_1, new_location="C4"
)  # two staging slots required

```

New in version 2\.16\.

Since staging area slots also include a standard deck slot in column 3, they are physically incompatible with powered modules in the same row of column 3\. For example, if you try to load a module in C3 and labware in C4, the API will raise an error:

```
temp_mod = protocol.load_module(
    module_name="temperature module gen2",
    location="C3"
)
staging_plate = protocol.load_labware(
    load_name="corning_96_wellplate_360ul_flat", location="C4"
)  # deck conflict error

```

It is possible to use slot D4 along with the waste chute. See the [Waste Chute](#configure-waste-chute) section below for details.

#### Trash Bin

In version 2\.15 of the API, Flex can only have a single trash bin in slot A3\. You do not have to (and cannot) load the trash in version 2\.15 protocols.

Starting in API version 2\.16, you must load trash bin fixtures in your protocol in order to use them. Use [`load_trash_bin()`](index.html#opentrons.protocol_api.ProtocolContext.load_trash_bin 'opentrons.protocol_api.ProtocolContext.load_trash_bin') to load a movable trash bin. This example loads a single bin in the default location:

```
default_trash = protocol.load_trash_bin(location = "A3")

```

New in version 2\.16\.

Call `load_trash_bin()` multiple times to add more than one bin. See [Adding Trash Containers](index.html#pipette-trash-containers) for more information on using pipettes with multiple trash bins.

#### Waste Chute

The waste chute accepts various materials from Flex pipettes or the Flex Gripper and uses gravity to transport them outside of the robot for disposal. Pipettes can dispose of liquid or drop tips into the chute. The gripper can drop tip racks and other labware into the chute.

To use the waste chute, first use [`load_waste_chute()`](index.html#opentrons.protocol_api.ProtocolContext.load_waste_chute 'opentrons.protocol_api.ProtocolContext.load_waste_chute') to load it in slot D3:

```
chute = protocol.load_waste_chute()

```

New in version 2\.16\.

The `load_waste_chute()` method takes no arguments, since D3 is the only valid location for the chute. However, there are multiple variant configurations of the waste chute, depending on how other methods in your protocol use it.

The waste chute is installed either on a standard deck plate adapter or on a deck plate adapter with a staging area. If any [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware') or [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') calls in your protocol reference slot D4, you have to use the deck plate adapter with staging area.

The waste chute has a removable cover with a narrow opening which helps prevent aerosols and droplets from contaminating the working area. 1\- and 8\-channel pipettes can dispense liquid, blow out, or drop tips through the opening in the cover. Any of the following require you to remove the cover.

> - [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense'), [`blow_out()`](index.html#opentrons.protocol_api.InstrumentContext.blow_out 'opentrons.protocol_api.InstrumentContext.blow_out'), or [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') with a 96\-channel pipette.
> - [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') with the chute as `new_location` and `use_gripper=True`.

If your protocol _does not_ call any of these methods, your deck configuration should include the cover.

In total, there are four possible deck configurations for the waste chute.\* Waste chute only

- Waste chute with cover
- Waste chute with staging area slot
- Waste chute with staging area slot and cover

### Deck Conflicts

A deck conflict check occurs when preparing to run a Python protocol on a Flex running robot system version 7\.1\.0 or higher. The Opentrons App and touchscreen will prevent you from starting the protocol run until any conflicts are resolved. You can resolve them one of two ways:

> - Physically move hardware around the deck, and update the deck configuration.
> - Alter your protocol to work with the current deck configuration, and resend the protocol to your Flex.

## Pipettes

### Loading Pipettes

When writing a protocol, you must inform the Protocol API about the pipettes you will be using on your robot. The [`ProtocolContext.load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') function provides this information and returns an [`InstrumentContext`](index.html#opentrons.protocol_api.InstrumentContext 'opentrons.protocol_api.InstrumentContext') object.

As noted above, you call the [`load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') method to load a pipette. This method also requires the [pipette’s API load name](#new-pipette-models), its left or right mount position, and (optionally) a list of associated tip racks. Even if you don’t use the pipette anywhere else in your protocol, the Opentrons App and the robot won’t let you start the protocol run until all pipettes loaded by `load_instrument()` are attached properly.

#### API Load Names

The pipette’s API load name (`instrument_name`) is the first parameter of the `load_instrument()` method. It tells your robot which attached pipette you’re going to use in a protocol. The tables below list the API load names for the currently available Flex and OT\-2 pipettes.

### Flex Pipettes

| Pipette Model            | Volume (µL)          | API Load Name         |     |
| ------------------------ | -------------------- | --------------------- | --- |
| Flex 1\-Channel Pipette  | 1–50                 | `flex_1channel_50`    |     |
| 5–1000                   | `flex_1channel_1000` |                       |
| Flex 8\-Channel Pipette  | 1–50                 | `flex_8channel_50`    |     |
| 5–1000                   | `flex_8channel_1000` |                       |
| Flex 96\-Channel Pipette | 5–1000               | `flex_96channel_1000` |     |

### OT-2 Pipettes

| Pipette Model              | Volume (µL)       | API Load Name       |
| -------------------------- | ----------------- | ------------------- |
| P20 Single\-Channel GEN2   | 1\-20             | `p20_single_gen2`   |
| P20 Multi\-Channel GEN2    | `p20_multi_gen2`  |
| P300 Single\-Channel GEN2  | 20\-300           | `p300_single_gen2`  |
| P300 Multi\-Channel GEN2   | `p300_multi_gen2` |
| P1000 Single\-Channel GEN2 | 100\-1000         | `p1000_single_gen2` |

See the [OT\-2 Pipette Generations](index.html#ot2-pipette-generations) section if you’re using GEN1 pipettes on an OT\-2\. The GEN1 family includes the P10, P50, and P300 single\- and multi\-channel pipettes, along with the P1000 single\-channel model.

#### Loading Flex 1\- and 8\-Channel Pipettes

This code sample loads a Flex 1\-Channel Pipette in the left mount and a Flex 8\-Channel Pipette in the right mount. Both pipettes are 1000 µL. Each pipette uses its own 1000 µL tip rack.

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel":"2.19"}

def run(protocol: protocol_api.ProtocolContext):
    tiprack1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="D1")
    tiprack2 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="C1")
    left = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack1])
    right = protocol.load_instrument(
        instrument_name="flex_8channel_1000",
        mount="right",
        tip_racks=[tiprack2])

```

If you’re writing a protocol that uses the Flex Gripper, you might think that this would be the place in your protocol to declare that. However, the gripper doesn’t require `load_instrument`! Whether your gripper requires a protocol is determined by the presence of [`ProtocolContext.move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') commands. See [Moving Labware](index.html#moving-labware) for more details.

#### Loading a Flex 96\-Channel Pipette

This code sample loads the Flex 96\-Channel Pipette. Because of its size, the Flex 96\-Channel Pipette requires the left _and_ right pipette mounts. You cannot use this pipette with 1\- or 8\-Channel Pipette in the same protocol or when these instruments are attached to the robot. Load the 96\-channel pipette as follows:

```
def run(protocol: protocol_api.ProtocolContext):
    pipette = protocol.load_instrument(
        instrument_name="flex_96channel_1000"
    )

```

In protocols specifying API version 2\.15, also include `mount="left"` as a parameter of `load_instrument()`.

New in version 2\.15\.

Changed in version 2\.16: The `mount` parameter is optional.

#### Loading OT\-2 Pipettes

This code sample loads a P1000 Single\-Channel GEN2 pipette in the left mount and a P300 Single\-Channel GEN2 pipette in the right mount. Each pipette uses its own 1000 µL tip rack.

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    tiprack1 = protocol.load_labware(
        load_name="opentrons_96_tiprack_1000ul", location=1)
    tiprack2 = protocol.load_labware(
        load_name="opentrons_96_tiprack_1000ul", location=2)
    left = protocol.load_instrument(
        instrument_name="p1000_single_gen2",
        mount="left",
        tip_racks=[tiprack1])
    right = protocol.load_instrument(
        instrument_name="p300_multi_gen2",
        mount="right",
        tip_racks=[tiprack1])

```

New in version 2\.0\.

#### Adding Tip Racks

The `load_instrument()` method includes the optional argument `tip_racks`. This parameter accepts a list of tip rack labware objects, which lets you to specify as many tip racks as you want. You can also edit a pipette’s tip racks after loading it by setting its [`InstrumentContext.tip_racks`](index.html#opentrons.protocol_api.InstrumentContext.tip_racks 'opentrons.protocol_api.InstrumentContext.tip_racks') property.

Note

Some methods, like [`configure_nozzle_layout()`](index.html#opentrons.protocol_api.InstrumentContext.configure_nozzle_layout 'opentrons.protocol_api.InstrumentContext.configure_nozzle_layout'), reset a pipette’s tip racks. See [Partial Tip Pickup](index.html#partial-tip-pickup) for more information.

The advantage of using `tip_racks` is twofold. First, associating tip racks with your pipette allows for automatic tip tracking throughout your protocol. Second, it removes the need to specify tip locations in the [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') method. For example, let’s start by loading loading some labware and instruments like this:

```
def run(protocol: protocol_api.ProtocolContext):
    tiprack_left = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul", location="D1")
    tiprack_right = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul", location="D2")
    left_pipette = protocol.load_instrument(
        instrument_name="flex_8channel_1000", mount="left")
    right_pipette = protocol.load_instrument(
        instrument_name="flex_8channel_1000",
        mount="right",
        tip_racks=[tiprack_right])

```

Let’s pick up a tip with the left pipette. We need to specify the location as an argument of `pick_up_tip()`, since we loaded the left pipette without a `tip_racks` argument.

```
left_pipette.pick_up_tip(tiprack_left["A1"])
left_pipette.drop_tip()

```

But now you have to specify `tiprack_left` every time you call `pick_up_tip`, which means you’re doing all your own tip tracking:

```
left_pipette.pick_up_tip(tiprack_left["A2"])
left_pipette.drop_tip()
left_pipette.pick_up_tip(tiprack_left["A3"])
left_pipette.drop_tip()

```

However, because you specified a tip rack location for the right pipette, the robot will automatically pick up from location `A1` of its associated tiprack:

```
right_pipette.pick_up_tip()
right_pipette.drop_tip()

```

Additional calls to `pick_up_tip` will automatically progress through the tips in the right rack:

```
right_pipette.pick_up_tip()  # picks up from A2
right_pipette.drop_tip()
right_pipette.pick_up_tip()  # picks up from A3
right_pipette.drop_tip()

```

New in version 2\.0\.

See also [Building Block Commands](index.html#v2-atomic-commands) and [Complex Commands](index.html#v2-complex-commands).

#### Adding Trash Containers

The API automatically assigns a [`trash_container`](index.html#opentrons.protocol_api.InstrumentContext.trash_container 'opentrons.protocol_api.InstrumentContext.trash_container') to pipettes, if one is available in your protocol. The `trash_container` is where the pipette will dispose tips when you call [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') with no arguments. You can change the trash container, if you don’t want to use the default.

One example of when you might want to change the trash container is a Flex protocol that goes through a lot of tips. In a case where the protocol uses two pipettes, you could load two trash bins and assign one to each pipette:

```
left_pipette = protocol.load_instrument(
    instrument_name="flex_8channel_1000", mount="left"
)
right_pipette = protocol.load_instrument(
    instrument_name="flex_8channel_50", mount="right"
)
left_trash = load_trash_bin("A3")
right_trash = load_trash_bin("B3")
left_pipette.trash_container = left_trash
right_pipette.trash_container = right_trash

```

Another example is a Flex protocol that uses a waste chute. Say you want to only dispose labware in the chute, and you want the pipette to drop tips in a trash bin. You can implicitly get the trash bin to be the pipette’s `trash_container` based on load order, or you can ensure it by setting it after all the load commands:

```
pipette = protocol.load_instrument(
    instrument_name="flex_1channel_1000",
    mount="left"
)
chute = protocol.load_waste_chute()  # default because loaded first
trash = protocol.load_trash_bin("A3")
pipette.trash_container = trash  # overrides default

```

New in version 2\.0\.

Changed in version 2\.16: Added support for `TrashBin` and `WasteChute` objects.

### Pipette Characteristics

Each Opentrons pipette has different capabilities, which you’ll want to take advantage of in your protocols. This page covers some fundamental pipette characteristics.

[Multi\-Channel Movement](#new-multichannel-pipettes) gives examples of how multi\-channel pipettes move around the deck by using just one of their channels as a reference point. Taking this into account is important for commanding your pipettes to perform actions in the correct locations.

[Pipette Flow Rates](#new-plunger-flow-rates) discusses how quickly each type of pipette can handle liquids. The defaults are designed to operate quickly, based on the pipette’s hardware and assuming that you’re handling aqueous liquids. You can speed up or slow down a pipette’s flow rate to suit your protocol’s needs.

Finally, the volume ranges of pipettes affect what you can do with them. The volume ranges for current pipettes are listed on the [Loading Pipettes](index.html#loading-pipettes) page. The [OT\-2 Pipette Generations](#ot2-pipette-generations) section of this page describes how the API behaves when running protocols that specify older OT\-2 pipettes.

#### Multi\-Channel Movement

All [building block](index.html#v2-atomic-commands) and [complex commands](index.html#v2-complex-commands) work with single\- and multi\-channel pipettes.

To keep the protocol API consistent when using single\- and multi\-channel pipettes, commands treat the back left channel of a multi\-channel pipette as its _primary channel_. Location arguments of pipetting commands use the primary channel. The [`InstrumentContext.configure_nozzle_layout()`](index.html#opentrons.protocol_api.InstrumentContext.configure_nozzle_layout 'opentrons.protocol_api.InstrumentContext.configure_nozzle_layout') method can change the pipette’s primary channel, using its `start` parameter. See [Partial Tip Pickup](index.html#partial-tip-pickup) for more information.

With a pipette’s default settings, you can generally access the wells indicated in the table below. Moving to any other well may cause the pipette to crash.

| Channels | 96\-well plate   | 384\-well plate  |
| -------- | ---------------- | ---------------- |
| 1        | Any well, A1–H12 | Any well, A1–P24 |
| 8        | A1–A12           | A1–B24           |
| 96       | A1 only          | A1–B2            |

Also, you should apply any location offset, such as [`Well.top()`](index.html#opentrons.protocol_api.Well.top 'opentrons.protocol_api.Well.top') or [`Well.bottom()`](index.html#opentrons.protocol_api.Well.bottom 'opentrons.protocol_api.Well.bottom'), to the well accessed by the primary channel. Since all of the pipette’s channels move together, each channel will have the same offset relative to the well that it is over.

Finally, because each multi\-channel pipette has only one motor, they always aspirate and dispense on all channels simultaneously.

##### 8\-Channel, 96\-Well Plate Example

To demonstrate these concepts, let’s write a protocol that uses a Flex 8\-Channel Pipette and a 96\-well plate. We’ll then aspirate and dispense a liquid to different locations on the same well plate. To start, let’s load a pipette in the right mount and add our labware.

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel":"2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # Load a tiprack for 1000 µL tips
    tiprack1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="D1")
    # Load a 96-well plate
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat", location="C1")
    # Load an 8-channel pipette on the right mount
    right = protocol.load_instrument(
        instrument_name="flex_8channel_1000",
        mount="right",
        tip_racks=[tiprack1])

```

After loading our instruments and labware, let’s tell the robot to pick up a pipette tip from location `A1` in `tiprack1`:

```
right.pick_up_tip()

```

With the backmost pipette channel above location A1 on the tip rack, all eight channels are above the eight tip rack wells in column 1\.

After picking up a tip, let’s tell the robot to aspirate 300 µL from the well plate at location `A2`:

```
right.aspirate(volume=300, location=plate["A2"])

```

With the backmost pipette tip above location A2 on the well plate, all eight channels are above the eight wells in column 2\.

Finally, let’s tell the robot to dispense 300 µL into the well plate at location `A3`:

```
right.dispense(volume=300, location=plate["A3"].top())

```

With the backmost pipette tip above location A3, all eight channels are above the eight wells in column 3\. The pipette will dispense liquid into all the wells simultaneously.

##### 8\-Channel, 384\-Well Plate Example

In general, you should specify wells in the first row of a well plate when using multi\-channel pipettes. An exception to this rule is when using 384\-well plates. The greater well density means the nozzles of a multi\-channel pipette can only access every other well in a column. Specifying well A1 accesses every other well starting with the first (rows A, C, E, G, I, K, M, and O). Similarly, specifying well B1 also accesses every other well, but starts with the second (rows B, D, F, H, J, L, N, and P).

To demonstrate these concepts, let’s write a protocol that uses a Flex 8\-Channel Pipette and a 384\-well plate. We’ll then aspirate and dispense a liquid to different locations on the same well plate. To start, let’s load a pipette in the right mount and add our labware.

```
def run(protocol: protocol_api.ProtocolContext):
    # Load a tiprack for 200 µL tips
    tiprack1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul", location="D1")
    # Load a well plate
    plate = protocol.load_labware(
        load_name="corning_384_wellplate_112ul_flat", location="D2")
    # Load an 8-channel pipette on the right mount
    right = protocol.load_instrument(
        instrument_name="flex_8channel_1000",
        mount="right",
        tip_racks=[tiprack1])

```

After loading our instruments and labware, let’s tell the robot to pick up a pipette tip from location `A1` in `tiprack1`:

```
right.pick_up_tip()

```

With the backmost pipette channel above location A1 on the tip rack, all eight channels are above the eight tip rack wells in column 1\.

After picking up a tip, let’s tell the robot to aspirate 100 µL from the well plate at location `A1`:

```
right.aspirate(volume=100, location=plate["A1"])

```

The eight pipette channels will only aspirate from every other well in the column: A1, C1, E1, G1, I1, K1, M1, and O1\.

Finally, let’s tell the robot to dispense 100 µL into the well plate at location `B1`:

```
right.dispense(volume=100, location=plate["B1"])

```

The eight pipette channels will only dispense into every other well in the column: B1, D1, F1, H1, J1, L1, N1, and P1\.

#### Pipette Flow Rates

Measured in µL/s, the flow rate determines how much liquid a pipette can aspirate, dispense, and blow out. Opentrons pipettes have their own default flow rates. The API lets you change the flow rate on a loaded [`InstrumentContext`](index.html#opentrons.protocol_api.InstrumentContext 'opentrons.protocol_api.InstrumentContext') by altering the [`InstrumentContext.flow_rate`](index.html#opentrons.protocol_api.InstrumentContext.flow_rate 'opentrons.protocol_api.InstrumentContext.flow_rate') properties listed below.

- Aspirate: `InstrumentContext.flow_rate.aspirate`
- Dispense: `InstrumentContext.flow_rate.dispense`
- Blow out: `InstrumentContext.flow_rate.blow_out`

These flow rate properties operate independently. This means you can specify different flow rates for each property within the same protocol. For example, let’s load a simple protocol and set different flow rates for the attached pipette.

```
def run(protocol: protocol_api.ProtocolContext):
    tiprack1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="D1")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack1])
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat", location="D3")
    pipette.pick_up_tip()

```

Let’s tell the robot to aspirate, dispense, and blow out the liquid using default flow rates. Notice how you don’t need to specify a `flow_rate` attribute to use the defaults:

```
pipette.aspirate(200, plate["A1"])  # 160 µL/s
pipette.dispense(200, plate["A2"])  # 160 µL/s
pipette.blow_out()                  #  80 µL/s

```

Now let’s change the flow rates for each action:

```
pipette.flow_rate.aspirate = 50
pipette.flow_rate.dispense = 100
pipette.flow_rate.blow_out = 75
pipette.aspirate(200, plate["A1"])  #  50 µL/s
pipette.dispense(200, plate["A2"])  # 100 µL/s
pipette.blow_out()                  #  75 µL/s

```

These flow rates will remain in effect until you change the `flow_rate` attribute again _or_ call `configure_for_volume()`. Calling `configure_for_volume()` always resets all pipette flow rates to the defaults for the mode that it sets.

Note

In API version 2\.13 and earlier, [`InstrumentContext.speed`](index.html#opentrons.protocol_api.InstrumentContext.speed 'opentrons.protocol_api.InstrumentContext.speed') offered similar functionality to `.flow_rate`. It attempted to set the plunger speed in mm/s. Due to technical limitations, that speed could only be approximate. You must use `.flow_rate` in version 2\.14 and later, and you should consider replacing older code that sets `.speed`.

New in version 2\.0\.

##### Flex Pipette Flow Rates

The default flow rates for Flex pipettes depend on the maximum volume of the pipette and the capacity of the currently attached tip. For each pipette–tip configuration, the default flow rate is the same for aspirate, dispense, and blowout actions.

| Pipette Model                       | Tip Capacity (µL) | Flow Rate (µL/s) |
| ----------------------------------- | ----------------- | ---------------- |
| 50 µL (1\- and 8\-channel)          | All capacities    | 57               |
| 1000 µL (1\-, 8\-, and 96\-channel) | 50                | 478              |
| 1000 µL (1\-, 8\-, and 96\-channel) | 200               | 716              |
| 1000 µL (1\-, 8\-, and 96\-channel) | 1000              | 716              |

Additionally, all Flex pipettes have a well bottom clearance of 1 mm for aspirate and dispense actions.

##### OT\-2 Pipette Flow Rates

The following table provides data on the default aspirate, dispense, and blowout flow rates (in µL/s) for OT\-2 GEN2 pipettes. Default flow rates are the same across all three actions.

| Pipette Model              | Volume (µL) | Flow Rates (µL/s)                                           |
| -------------------------- | ----------- | ----------------------------------------------------------- |
| P20 Single\-Channel GEN2   | 1–20        | _ API v2\.6 or higher: 7\.56 _ API v2\.5 or lower: 3\.78    |
| P300 Single\-Channel GEN2  | 20–300      | _ API v2\.6 or higher: 92\.86 _ API v2\.5 or lower: 46\.43  |
| P1000 Single\-Channel GEN2 | 100–1000    | _ API v2\.6 or higher: 274\.7 _ API v2\.5 or lower: 137\.35 |
| P20 Multi\-Channel GEN2    | 1–20        | 7\.6                                                        |
| P300 Multi\-Channel GEN2   | 20–300      | 94                                                          |

Additionally, all OT\-2 GEN2 pipettes have a default head speed of 400 mm/s and a well bottom clearance of 1 mm for aspirate and dispense actions.

#### OT\-2 Pipette Generations

The OT\-2 works with the GEN1 and GEN2 pipette models. The newer GEN2 pipettes have different volume ranges than the older GEN1 pipettes. With some exceptions, the volume ranges for GEN2 pipettes overlap those used by the GEN1 models. If your protocol specifies a GEN1 pipette, but you have a GEN2 pipette with a compatible volume range, you can still run your protocol. The OT\-2 will consider the GEN2 pipette to have the same minimum volume as the GEN1 pipette. The following table lists the volume compatibility between the GEN2 and GEN1 pipettes.

| GEN2 Pipette               | GEN1 Pipette               | GEN1 Volume  |
| -------------------------- | -------------------------- | ------------ |
| P20 Single\-Channel GEN2   | P10 Single\-Channel GEN1   | 1\-10 µL     |
| P20 Multi\-Channel GEN2    | P10 Multi\-Channel GEN1    | 1\-10 µL     |
| P300 Single\-Channel GEN2  | P300 Single\-Channel GEN1  | 30\-300 µL   |
| P300 Multi\-Channel GEN2   | P300 Multi\-Channel GEN1   | 20\-200 µL   |
| P1000 Single\-Channel GEN2 | P1000 Single\-Channel GEN1 | 100\-1000 µL |

The single\- and multi\-channel P50 GEN1 pipettes are the exceptions here. If your protocol uses a P50 GEN1 pipette, there is no backward compatibility with a related GEN2 pipette. To replace a P50 GEN1 with a corresponding GEN2 pipette, edit your protocol to load a P20 Single\-Channel GEN2 (for volumes below 20 µL) or a P300 Single\-Channel GEN2 (for volumes between 20 and 50 µL).

### Partial Tip Pickup

The 96\-channel pipette occupies both pipette mounts on Flex, so it’s not possible to attach another pipette at the same time. Partial tip pickup lets you perform some of the same actions that you would be able to perform with a second pipette. As of version 2\.16 of the API, you can configure the 96\-channel pipette to pick up a single column of tips, similar to the behavior of an 8\-channel pipette.

#### Nozzle Layout

Use the [`configure_nozzle_layout()`](index.html#opentrons.protocol_api.InstrumentContext.configure_nozzle_layout 'opentrons.protocol_api.InstrumentContext.configure_nozzle_layout') method to choose how many tips the 96\-channel pipette will pick up. The method’s `style` parameter accepts special layout constants. You must import these constants at the top of your protocol, or you won’t be able to configure the pipette for partial tip pickup.

At minimum, import the API from the `opentrons` package:

```
from opentrons import protocol_api

```

Then when you call `configure_nozzle_layout` later in your protocol, you can set `style=protocol_api.COLUMN`.

For greater convenience, also import the individual layout constants that you plan to use in your protocol:

```
from opentrons.protocol_api import COLUMN, ALL

```

Then when you call `configure_nozzle_layout` later in your protocol, you can set `style=COLUMN`.

Here is the start of a protocol that performs both imports, loads a 96\-channel pipette, and sets it to pick up a single column of tips.

```
from opentrons import protocol_api
from opentrons.protocol_api import COLUMN, ALL

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    column_rack = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul",
        location="D3"
    )
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument("flex_96channel_1000")
    pipette.configure_nozzle_layout(
        style=COLUMN,
        start="A12",
        tip_racks=[column_rack]
    )

```

New in version 2\.16\.

Let’s unpack some of the details of this code.

First, we’ve given a special name to the tip rack, `column_rack`. You can name your tip racks whatever you like, but if you’re performing full pickup and partial pickup in the same protocol, you’ll need to keep them separate. See [Tip Rack Adapters](#partial-tip-rack-adapters) below.

Next, we load the 96\-channel pipette. Note that [`load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') only has a single argument. The 96\-channel pipette occupies both mounts, so `mount` is omissible. The `tip_racks` argument is always optional. But it would have no effect to declare it here, because every call to `configure_nozzle_layout()` resets the pipette’s [`InstrumentContext.tip_racks`](index.html#opentrons.protocol_api.InstrumentContext.tip_racks 'opentrons.protocol_api.InstrumentContext.tip_racks') property.

Finally, we configure the nozzle layout, with three arguments.

> - The `style` parameter directly accepts the `COLUMN` constant, since we imported it at the top of the protocol.
> - The `start` parameter accepts a nozzle name, representing the back\-left nozzle in the layout, as a string. `"A12"` tells the pipette to use its rightmost column of nozzles for pipetting.
> - The `tip_racks` parameter tells the pipette which racks to use for tip tracking, just like [adding tip racks](index.html#pipette-tip-racks) when loading a pipette.

In this configuration, pipetting actions will use a single column:

```
# configured in COLUMN mode
pipette.pick_up_tip()  # picks up A1-H1 from tip rack
pipette.drop_tip()
pipette.pick_up_tip()  # picks up A2-H2 from tip rack

```

Warning

[`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') always accepts a `location` argument, regardless of nozzle configuration. Do not pass a value that would lead the pipette to line up over more unused tips than specified by the current layout. For example, setting `COLUMN` layout and then calling `pipette.pick_up_tip(tip_rack["A2"])` on a full tip rack will lead to unexpected pipetting behavior and potential crashes.

#### Tip Rack Adapters

You can use both partial and full tip pickup in the same protocol. This requires having some tip racks directly on the deck, and some tip racks in the tip rack adapter.

Do not use a tip rack adapter when performing partial tip pickup. Instead, place the tip rack on the deck. During partial tip pickup, the 96\-channel pipette lowers onto the tip rack in a horizontally offset position. If the tip rack were in its adapter, the pipette would collide with the adapter’s posts, which protrude above the top of the tip rack. If you configure the pipette for partial pickup and then call `pick_up_tip()` on a tip rack that’s loaded onto an adapter, the API will raise an error.

On the other hand, you must use the tip rack adapter for full tip pickup. If the 96\-channel pipette is in a full layout, either by default or by configuring `style=ALL`, and you then call `pick_up_tip()` on a tip rack that’s not in an adapter, the API will raise an error.

When switching between full and partial pickup, you may want to organize your tip racks into lists, depending on whether they’re loaded on adapters or not.

```
tips_1 = protocol.load_labware(
    "opentrons_flex_96_tiprack_1000ul", "C1"
)
tips_2 = protocol.load_labware(
    "opentrons_flex_96_tiprack_1000ul", "D1"
)
tips_3 = protocol.load_labware(
    "opentrons_flex_96_tiprack_1000ul", "C3",
    adapter="opentrons_flex_96_tiprack_adapter"
)
tips_4 = protocol.load_labware(
    "opentrons_flex_96_tiprack_1000ul", "D3",
    adapter="opentrons_flex_96_tiprack_adapter"
)

partial_tip_racks = [tips_1, tips_2]
full_tip_racks = [tips_3, tips_4]

```

Tip

It’s also good practice to keep separate lists of tip racks when using multiple partial tip pickup configurations (i.e., using both column 1 and column 12 in the same protocol). This improves positional accuracy when picking up tips. Additionally, use Labware Position Check in the Opentrons App to ensure that the partial configuration is well\-aligned to the rack.

Now, when you configure the nozzle layout, you can reference the appropriate list as the value of `tip_racks`:

```
pipette.configure_nozzle_layout(
    style=COLUMN,
    start="A12",
    tip_racks=partial_tip_racks
)
# partial pipetting commands go here

pipette.configure_nozzle_layout(
    style=ALL,
    tip_racks=full_tip_racks
)
pipette.pick_up_tip()  # picks up full rack in C1

```

This keeps tip tracking consistent across each type of pickup. And it reduces the risk of errors due to the incorrect presence or absence of a tip rack adapter.

#### Tip Pickup and Conflicts

During partial tip pickup, 96\-channel pipette moves into spaces above adjacent slots. To avoid crashes, the API prevents you from performing partial tip pickup when there is tall labware in these spaces. The current nozzle layout determines which labware can safely occupy adjacent slots.

The API will raise errors for potential labware crashes when using a column nozzle configuration. Nevertheless, it’s a good idea to do the following when working with partial tip pickup:

> - Plan your deck layout carefully. Make a diagram and visualize everywhere the pipette will travel.
> - Simulate your protocol and compare the run preview to your expectations of where the pipette will travel.
> - Perform a dry run with only tip racks on the deck. Have the Emergency Stop Pendant handy in case you see an impending crash.

For column pickup, Opentrons recommends using the nozzles in column 12 of the pipette:

```
pipette.configure_nozzle_layout(
    style=COLUMN,
    start="A12",
)

```

When using column 12, the pipette overhangs space to the left of wherever it is picking up tips or pipetting. For this reason, it’s a good idea to organize tip racks front to back on the deck. If you place them side by side, the rack to the right will be inaccessible. For example, let’s load three tip racks in the front left corner of the deck:

```
tips_C1 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "C1")
tips_D1 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "D1")
tips_D2 = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "D2")

```

Now the pipette will be able to access the racks in column 1 only. `pick_up_tip(tips_D2["A1"])` will raise an error due to the tip rack immediately to its left, in slot D1\. There a couple of ways to avoid this error:

> - Load the tip rack in a different slot, with no tall labware to its left.
> - Use all the tips in slot D1 first, and then use [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') to make space for the pipette before picking up tips from D2\.

You would get a similar error trying to aspirate from or dispense into a well plate in slot D3, since there is a tip rack to the left.

Tip

When using column 12 for partial tip pickup and pipetting, generally organize your deck with the shortest labware on the left side of the deck, and the tallest labware on the right side.

If your application can’t accommodate a deck layout that works well with column 12, you can configure the 96\-channel pipette to pick up tips with column 1:

```
pipette.configure_nozzle_layout(
    style=COLUMN,
    start="A1",
)

```

Note

When using a column 1 layout, the pipette can’t reach the rightmost portion of labware in slots A3–D3\. Any well that is within 29 mm of the right edge of the slot may be inaccessible. Use a column 12 layout if you need to pipette in that area.

### Volume Modes

The Flex 1\-Channel 50 µL and Flex 8\-Channel 50 µL pipettes must operate in a low\-volume mode to accurately dispense very small volumes of liquid. Set the volume mode by calling [`InstrumentContext.configure_for_volume()`](index.html#opentrons.protocol_api.InstrumentContext.configure_for_volume 'opentrons.protocol_api.InstrumentContext.configure_for_volume') with the amount of liquid you plan to aspirate, in µL:

```
pipette50.configure_for_volume(1)
pipette50.pick_up_tip()
pipette50.aspirate(1, plate["A1"])

```

New in version 2\.15\.

Passing different values to `configure_for_volume()` changes the minimum and maximum volume of Flex 50 µL pipettes as follows:

| Value  | Minimum Volume (µL) | Maximum Volume (µL) |
| ------ | ------------------- | ------------------- |
| 1–4\.9 | 1                   | 30                  |
| 5–50   | 5                   | 50                  |

Note

The pipette must not contain liquid when you call `configure_for_volume()`, or the API will raise an error.

Also, if the pipette is in a well location that may contain liquid, it will move upward to ensure it is not immersed in liquid before changing its mode. Calling `configure_for_volume()` _before_ `pick_up_tip()` helps to avoid this situation.

In a protocol that handles many different volumes, it’s a good practice to call `configure_for_volume()` once for each [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') or [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate'), specifying the volume that you are about to handle. When operating with a list of volumes, nest `configure_for_volume()` inside a `for` loop to ensure that the pipette is properly configured for each volume:

```
volumes = [1, 2, 3, 4, 1, 5, 2, 8]
sources = plate.columns()[0]
destinations = plate.columns()[1]
for i in range(8):
    pipette50.configure_for_volume(volumes[i])
    pipette50.pick_up_tip()
    pipette50.aspirate(volume=volumes[i], location=sources[i])
    pipette50.dispense(location=destinations[i])
    pipette50.drop_tip()

```

If you know that all your liquid handling will take place in a specific mode, then you can call `configure_for_volume()` just once with a representative volume. Or if all the volumes correspond to the pipette’s default mode, you don’t have to call `configure_for_volume()` at all.

Opentrons pipettes are configurable devices used to move liquids throughout the working area during the execution of protocols. Flex and OT\-2 each have their own pipettes, which are available for use in the Python API.

Pages in this section of the documentation cover:

> - [Loading pipettes](index.html#loading-pipettes) into your protocol.
> - [Pipette characteristics](index.html#pipette-characteristics), such as how fast they can move liquid and how they move around the deck.
> - The [partial tip pickup](index.html#partial-tip-pickup) configuration for the Flex 96\-Channel Pipette, which uses only 8 channels for pipetting. Full and partial tip pickup can be combined in a single protocol.
> - The [volume modes](index.html#pipette-volume-modes) of Flex 50 µL pipettes, which must operate in low\-volume mode to accurately dispense very small volumes of liquid.

For information about liquid handling, see [Building Block Commands](index.html#v2-atomic-commands) and [Complex Commands](index.html#v2-complex-commands).

## Building Block Commands

### Manipulating Pipette Tips

Your robot needs to attach a disposable tip to the pipette before it can aspirate or dispense liquids. The API provides three basic functions that help the robot attach and manage pipette tips during a protocol run. These methods are [`InstrumentContext.pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip'), [`InstrumentContext.drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip'), and [`InstrumentContext.return_tip()`](index.html#opentrons.protocol_api.InstrumentContext.return_tip 'opentrons.protocol_api.InstrumentContext.return_tip'). Respectively, these methods tell the robot to pick up a tip from a tip rack, drop a tip into the trash (or another location), and return a tip to its location in the tip rack.

The following sections demonstrate how to use each method and include sample code. The examples used here assume that you’ve loaded the pipettes and labware from the basic [protocol template](index.html#protocol-template).

#### Picking Up a Tip

To pick up a tip, call the [`pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') method without any arguments:

```
pipette.pick_up_tip()

```

When added to the protocol template, this simple statement works because the API knows which tip rack is associated with `pipette`, as indicated by `tip_racks=[tiprack_1]` in the [`load_instrument()`](index.html#opentrons.protocol_api.ProtocolContext.load_instrument 'opentrons.protocol_api.ProtocolContext.load_instrument') call. And it knows the on\-deck location of the tip rack (slot D3 on Flex, slot 3 on OT\-2\) from the `location` argument of [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware'). Given this information, the robot moves to the tip rack and picks up a tip from position A1 in the rack. On subsequent calls to `pick_up_tip()`, the robot will use the next available tip. For example:

```
pipette.pick_up_tip()  # picks up tip from rack location A1
pipette.drop_tip()     # drops tip in trash bin
pipette.pick_up_tip()  # picks up tip from rack location B1
pipette.drop_tip()     # drops tip in trash bin

```

If you omit the `tip_rack` argument from the `pipette` variable, the API will raise an error. In that case, you must pass the tip rack’s location to `pick_up_tip` like this:

```
pipette.pick_up_tip(tiprack_1["A1"])
pipette.drop_tip()
pipette.pick_up_tip(tiprack_1["B1"])

```

In most cases, it’s best to associate tip racks with a pipette and let the API automatically track pickup location for you. This also makes it easy to pick up tips when iterating over a loop, as shown in the next section.

New in version 2\.0\.

#### Automating Tip Pick Up

When used with Python’s [`range`](https://docs.python.org/3/library/stdtypes.html#range '(in Python v3.12)') class, a `for` loop brings automation to the tip pickup and tracking process. It also eliminates the need to call `pick_up_tip()` multiple times. For example, this snippet tells the robot to sequentially use all the tips in a 96\-tip rack:

```
for i in range(96):
    pipette.pick_up_tip()
    # liquid handling commands
    pipette.drop_tip()

```

If your protocol requires a lot of tips, add a second tip rack to the protocol. Then, associate it with your pipette and increase the number of repetitions in the loop. The robot will work through both racks.

First, add another tip rack to the sample protocol:

```
tiprack_2 = protocol.load_labware(
    load_name="opentrons_flex_96_tiprack_1000ul",
    location="C3"
)

```

Next, change the pipette’s `tip_rack` property to include the additional rack:

```
pipette = protocol.load_instrument(
    instrument_name="flex_1channel_1000",
    mount="left",
    tip_racks=[tiprack_1, tiprack_2],
)

```

Finally, iterate over a larger range:

```
for i in range(192):
    pipette.pick_up_tip()
    # liquid handling commands
    pipette.drop_tip()

```

For a more advanced “real\-world” example, review the [off\-deck location protocol](index.html#off-deck-location) on the [Moving Labware](index.html#moving-labware) page. This example also uses a `for` loop to iterate through a tip rack, but it includes other commands that pause the protocol and let you replace an on\-deck tip rack with another rack stored in an off\-deck location.

#### Dropping a Tip

To drop a tip in the pipette’s trash container, call the [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') method with no arguments:

```
pipette.pick_up_tip()

```

You can specify where to drop the tip by passing in a location. For example, this code drops a tip in the trash bin and returns another tip to to a previously used well in a tip rack:

```
pipette.pick_up_tip()            # picks up tip from rack location A1
pipette.drop_tip()               # drops tip in default trash container
pipette.pick_up_tip()            # picks up tip from rack location B1
pipette.drop_tip(tiprack["A1"])  # drops tip in rack location A1

```

New in version 2\.0\.

Another use of the `location` parameter is to drop a tip in a specific trash container. For example, calling `pipette.drop_tip(chute)` will dispose tips in the waste chute, even if the pipette’s default trash container is a trash bin:

```
pipette.pick_up_tip()    # picks up tip from rack location A1
pipette.drop_tip()       # drops tip in default trash container
pipette.pick_up_tip()    # picks up tip from rack location B1
pipette.drop_tip(chute)  # drops tip in waste chute

```

New in version 2\.16\.

#### Returning a Tip

To return a tip to its original location, call the [`return_tip()`](index.html#opentrons.protocol_api.InstrumentContext.return_tip 'opentrons.protocol_api.InstrumentContext.return_tip') method with no arguments:

```
pipette.return_tip()

```

New in version 2\.0\.

Note

You can’t return tips with a pipette that’s configured to use [partial tip pickup](index.html#partial-tip-pickup). This restriction ensures that the pipette has clear access to unused tips. For example, a 96\-channel pipette in column configuration can’t reach column 2 unless column 1 is empty.

If you call `return_tip()` while using partial tip pickup, the API will raise an error. Use `drop_tip()` to dispose the tips instead.

#### Working With Used Tips

Currently, the API considers tips as “used” after being picked up. For example, if the robot picked up a tip from rack location A1 and then returned it to the same location, it will not attempt to pick up this tip again, unless explicitly specified. Instead, the robot will pick up a tip starting from rack location B1\. For example:

```
pipette.pick_up_tip()                # picks up tip from rack location A1
pipette.return_tip()                 # drops tip in rack location A1
pipette.pick_up_tip()                # picks up tip from rack location B1
pipette.drop_tip()                   # drops tip in trash bin
pipette.pick_up_tip(tiprack_1["A1"]) # picks up tip from rack location A1

```

Early API versions treated returned tips as unused items. They could be picked up again without an explicit argument. For example:

```
pipette.pick_up_tip()  # picks up tip from rack location A1
pipette.return_tip()   # drops tip in rack location A1
pipette.pick_up_tip()  # picks up tip from rack location A1

```

Changed in version 2\.2\.

### Liquid Control

After attaching a tip, your robot is ready to aspirate, dispense, and perform other liquid handling tasks. The API includes methods that help you perform these actions and the following sections show how to use them. The examples used here assume that you’ve loaded the pipettes and labware from the basic [protocol template](index.html#protocol-template).

#### Aspirate

To draw liquid up into a pipette tip, call the [`InstrumentContext.aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate') method. Using this method, you can specify the aspiration volume in µL, the well location, and pipette flow rate. Other parameters let you position the pipette within a well. For example, this snippet tells the robot to aspirate 200 µL from well location A1\.

```
pipette.pick_up_tip()
pipette.aspirate(200, plate["A1"])

```

If the pipette doesn’t move, you can specify an additional aspiration action without including a location. To demonstrate, this code snippet pauses the protocol, automatically resumes it, and aspirates a second time from `plate["A1"]`).

```
pipette.pick_up_tip()
pipette.aspirate(200, plate["A1"])
protocol.delay(seconds=5) # pause for 5 seconds
pipette.aspirate(100)     # aspirate 100 µL at current position

```

Now our pipette holds 300 µL.

##### Aspirate by Well or Location

The [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate') method includes a `location` parameter that accepts either a [`Well`](index.html#opentrons.protocol_api.Well 'opentrons.protocol_api.Well') or a [`Location`](index.html#opentrons.types.Location 'opentrons.types.Location').

If you specify a well, like `plate["A1"]`, the pipette will aspirate from a default position 1 mm above the bottom center of that well. To change the default clearance, first set the `aspirate` attribute of [`well_bottom_clearance`](index.html#opentrons.protocol_api.InstrumentContext.well_bottom_clearance 'opentrons.protocol_api.InstrumentContext.well_bottom_clearance'):

```
pipette.pick_up_tip
pipette.well_bottom_clearance.aspirate = 2  # tip is 2 mm above well bottom
pipette.aspirate(200, plate["A1"])

```

You can also aspirate from a location along the center vertical axis within a well using the [`Well.top()`](index.html#opentrons.protocol_api.Well.top 'opentrons.protocol_api.Well.top') and [`Well.bottom()`](index.html#opentrons.protocol_api.Well.bottom 'opentrons.protocol_api.Well.bottom') methods. These methods move the pipette to a specified distance relative to the top or bottom center of a well:

```
pipette.pick_up_tip()
depth = plate["A1"].bottom(z=2) # tip is 2 mm above well bottom
pipette.aspirate(200, depth)

```

See also:

- [Default Positions](index.html#new-default-op-positions) for information about controlling pipette height for a particular pipette.
- [Position Relative to Labware](index.html#position-relative-labware) for information about controlling pipette height from within a well.
- [Move To](index.html#move-to) for information about moving a pipette to any reachable deck location.

##### Aspiration Flow Rates

Flex and OT\-2 pipettes aspirate at [default flow rates](index.html#new-plunger-flow-rates) measured in µL/s. Specifying the `rate` parameter multiplies the flow rate by that value. As a best practice, don’t set the flow rate higher than 3x the default. For example, this code causes the pipette to aspirate at twice its normal rate:

```
pipette.aspirate(200, plate["A1"], rate=2.0)

```

New in version 2\.0\.

#### Dispense

To dispense liquid from a pipette tip, call the [`InstrumentContext.dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') method. Using this method, you can specify the dispense volume in µL, the well location, and pipette flow rate. Other parameters let you position the pipette within a well. For example, this snippet tells the robot to dispense 200 µL into well location B1\.

```
pipette.dispense(200, plate["B1"])

```

Note

In API version 2\.16 and earlier, you could pass a `volume` argument to `dispense()` greater than what was aspirated into the pipette. In this case, the API would ignore `volume` and dispense the pipette’s [`current_volume`](index.html#opentrons.protocol_api.InstrumentContext.current_volume 'opentrons.protocol_api.InstrumentContext.current_volume'). The robot _would not_ move the plunger lower as a result.

In version 2\.17 and later, passing such values raises an error.

To move the plunger a small extra amount, add a [push out](#push-out-dispense). Or to move it a large amount, use [blow out](#blow-out).

If the pipette doesn’t move, you can specify an additional dispense action without including a location. To demonstrate, this code snippet pauses the protocol, automatically resumes it, and dispense a second time from location B1\.

```
pipette.dispense(100, plate["B1"])
protocol.delay(seconds=5) # pause for 5 seconds
pipette.dispense(100)     # dispense 100 µL at current position

```

##### Dispense by Well or Location

The [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') method includes a `location` parameter that accepts either a [`Well`](index.html#opentrons.protocol_api.Well 'opentrons.protocol_api.Well') or a [`Location`](index.html#opentrons.types.Location 'opentrons.types.Location').

If you specify a well, like `plate["B1"]`, the pipette will dispense from a default position 1 mm above the bottom center of that well. To change the default clearance, you would call [`well_bottom_clearance`](index.html#opentrons.protocol_api.InstrumentContext.well_bottom_clearance 'opentrons.protocol_api.InstrumentContext.well_bottom_clearance'):

```
pipette.well_bottom_clearance.dispense=2 # tip is 2 mm above well bottom
pipette.dispense(200, plate["B1"])

```

You can also dispense from a location along the center vertical axis within a well using the [`Well.top()`](index.html#opentrons.protocol_api.Well.top 'opentrons.protocol_api.Well.top') and [`Well.bottom()`](index.html#opentrons.protocol_api.Well.bottom 'opentrons.protocol_api.Well.bottom') methods. These methods move the pipette to a specified distance relative to the top or bottom center of a well:

```
depth = plate["B1"].bottom(z=2) # tip is 2 mm above well bottom
pipette.dispense(200, depth)

```

See also:

- [Default Positions](index.html#new-default-op-positions) for information about controlling pipette height for a particular pipette.
- [Position Relative to Labware](index.html#position-relative-labware) for formation about controlling pipette height from within a well.
- [Move To](index.html#move-to) for information about moving a pipette to any reachable deck location.

##### Dispense Flow Rates

Flex and OT\-2 pipettes dispense at [default flow rates](index.html#new-plunger-flow-rates) measured in µL/s. Adding a number to the `rate` parameter multiplies the flow rate by that value. As a best practice, don’t set the flow rate higher than 3x the default. For example, this code causes the pipette to dispense at twice its normal rate:

```
pipette.dispense(200, plate["B1"], rate=2.0)

```

New in version 2\.0\.

##### Push Out After Dispense

The optional `push_out` parameter of `dispense()` helps ensure all liquid leaves the tip. Use `push_out` for applications that require moving the pipette plunger lower than the default, without performing a full [blow out](#blow-out).

For example, this dispense action moves the plunger the equivalent of an additional 5 µL beyond where it would stop if `push_out` was set to zero or omitted:

```
pipette.pick_up_tip()
pipette.aspirate(100, plate["A1"])
pipette.dispense(100, plate["B1"], push_out=5)
pipette.drop_tip()

```

New in version 2\.15\.

#### Blow Out

To blow an extra amount of air through the pipette’s tip, call the [`InstrumentContext.blow_out()`](index.html#opentrons.protocol_api.InstrumentContext.blow_out 'opentrons.protocol_api.InstrumentContext.blow_out') method. You can use a specific well in a well plate or reservoir as the blowout location. If no location is specified, the pipette will blowout from its current well position:

```
pipette.blow_out()

```

You can also specify a particular well as the blowout location:

```
pipette.blow_out(plate["B1"])

```

Many protocols use a trash container for blowing out the pipette. You can specify the pipette’s current trash container as the blowout location by using the [`InstrumentContext.trash_container`](index.html#opentrons.protocol_api.InstrumentContext.trash_container 'opentrons.protocol_api.InstrumentContext.trash_container') property:

```
pipette.blow_out(pipette.trash_container)

```

New in version 2\.0\.

Changed in version 2\.16: Added support for `TrashBin` and `WasteChute` locations.

#### Touch Tip

The [`InstrumentContext.touch_tip()`](index.html#opentrons.protocol_api.InstrumentContext.touch_tip 'opentrons.protocol_api.InstrumentContext.touch_tip') method moves the pipette so the tip touches each wall of a well. A touch tip procedure helps knock off any droplets that might cling to the pipette’s tip. This method includes optional arguments that allow you to control where the tip will touch the inner walls of a well and the touch speed. Calling [`touch_tip()`](index.html#opentrons.protocol_api.InstrumentContext.touch_tip 'opentrons.protocol_api.InstrumentContext.touch_tip') without arguments causes the pipette to touch the well walls from its current location:

```
pipette.touch_tip()

```

##### Touch Location

These optional location arguments give you control over where the tip will touch the side of a well.

This example demonstrates touching the tip in a specific well:

```
pipette.touch_tip(plate["B1"])

```

This example uses an offset to set the touch tip location 2mm below the top of the current well:

```
pipette.touch_tip(v_offset=-2)

```

This example moves the pipette 75% of well’s total radius and 2 mm below the top of well:

```
pipette.touch_tip(plate["B1"],
                  radius=0.75,
                  v_offset=-2)

```

The `touch_tip` feature allows the pipette to touch the edges of a well gently instead of crashing into them. It includes the `radius` argument. When `radius=1` the robot moves the centerline of the pipette’s plunger axis to the edge of a well. This means a pipette tip may sometimes touch the well wall too early, causing it to bend inwards. A smaller radius helps avoid premature wall collisions and a lower speed produces gentler motion. Different liquid droplets behave differently, so test out these parameters in a single well before performing a full protocol run.

Warning

_Do not_ set the `radius` value greater than `1.0`. When `radius` is \> `1.0`, the robot will forcibly move the pipette tip across a well wall or edge. This type of aggressive movement can damage the pipette tip and the pipette.

##### Touch Speed

Touch speed controls how fast the pipette moves in mm/s during a touch tip step. The default movement speed is 60 mm/s, the minimum is 1 mm/s, and the maximum is 80 mm/s. Calling `touch_tip` without any arguments moves a tip at the default speed in the current well:

```
pipette.touch_tip()

```

This example specifies a well location and sets the speed to 20 mm/s:

```
pipette.touch_tip(plate["B1"], speed=20)

```

This example uses the current well and sets the speed to 80 mm/s:

```
pipette.touch_tip(speed=80)

```

New in version 2\.0\.

Changed in version 2\.4: Lowered minimum speed to 1 mm/s.

#### Mix

The [`mix()`](index.html#opentrons.protocol_api.InstrumentContext.mix 'opentrons.protocol_api.InstrumentContext.mix') method aspirates and dispenses repeatedly in a single location. It’s designed to mix the contents of a well together using a single command rather than using multiple `aspirate()` and `dispense()` calls. This method includes arguments that let you specify the number of times to mix, the volume (in µL) of liquid, and the well that contains the liquid you want to mix.

This example draws 100 µL from the current well and mixes it three times:

```
pipette.mix(repetitions=3, volume=100)

```

This example draws 100 µL from well B1 and mixes it three times:

```
pipette.mix(3, 100, plate["B1"])

```

This example draws an amount equal to the pipette’s maximum rated volume and mixes it three times:

```
pipette.mix(repetitions=3)

```

Note

In API versions 2\.2 and earlier, during a mix, the pipette moves up and out of the target well. In API versions 2\.3 and later, the pipette does not move while mixing.

New in version 2\.0\.

#### Air Gap

The [`InstrumentContext.air_gap()`](index.html#opentrons.protocol_api.InstrumentContext.air_gap 'opentrons.protocol_api.InstrumentContext.air_gap') method tells the pipette to draw in air before or after a liquid. Creating an air gap helps keep liquids from seeping out of a pipette after drawing it from a well. This method includes arguments that give you control over the amount of air to aspirate and the pipette’s height (in mm) above the well. By default, the pipette moves 5 mm above a well before aspirating air. Calling [`air_gap()`](index.html#opentrons.protocol_api.InstrumentContext.air_gap 'opentrons.protocol_api.InstrumentContext.air_gap') with no arguments uses the entire remaining volume in the pipette.

This example aspirates 200 µL of air 5 mm above the current well:

```
pipette.air_gap(volume=200)

```

This example aspirates 200 µL of air 20 mm above the the current well:

```
pipette.air_gap(volume=200, height=20)

```

This example aspirates enough air to fill the remaining volume in a pipette:

```
pipette.air_gap()

```

New in version 2\.0\.

### Utility Commands

With utility commands, you can control various robot functions such as pausing or delaying a protocol, checking the robot’s door, turning robot lights on/off, and more. The following sections show you how to these utility commands and include sample code. The examples used here assume that you’ve loaded the pipettes and labware from the basic [protocol template](index.html#protocol-template).

#### Delay and Resume

Call the [`ProtocolContext.delay()`](index.html#opentrons.protocol_api.ProtocolContext.delay 'opentrons.protocol_api.ProtocolContext.delay') method to insert a timed delay into your protocol. This method accepts time increments in seconds, minutes, or combinations of both. Your protocol resumes automatically after the specified time expires.

This example delays a protocol for 10 seconds:

```
protocol.delay(seconds=10)

```

This example delays a protocol for 5 minutes:

```
protocol.delay(minutes=5)

```

This example delays a protocol for 5 minutes and 10 seconds:

```
protocol.delay(minutes=5, seconds=10)

```

#### Pause Until Resumed

Call the [`ProtocolContext.pause()`](index.html#opentrons.protocol_api.ProtocolContext.pause 'opentrons.protocol_api.ProtocolContext.pause') method to stop a protocol at a specific step. Unlike a delay, [`pause()`](index.html#opentrons.protocol_api.ProtocolContext.pause 'opentrons.protocol_api.ProtocolContext.pause') does not restart your protocol automatically. To resume, you’ll respond to a prompt on the touchscreen or in the Opentrons App. This method also lets you specify an optional message that provides on\-screen or in\-app instructions on how to proceed. This example inserts a pause and includes a brief message:

```
protocol.pause("Remember to get more pipette tips")

```

New in version 2\.0\.

#### Homing

Homing commands the robot to move the gantry, a pipette, or a pipette plunger to a defined position. For example, homing the gantry moves it to the back right of the working area. With the available homing methods you can home the gantry, home the mounted pipette and plunger, and home the pipette plunger. These functions take no arguments.

To home the gantry, call [`ProtocolContext.home()`](index.html#opentrons.protocol_api.ProtocolContext.home 'opentrons.protocol_api.ProtocolContext.home'):

```
protocol.home()

```

To home a specific pipette’s Z axis and plunger, call [`InstrumentContext.home()`](index.html#opentrons.protocol_api.InstrumentContext.home 'opentrons.protocol_api.InstrumentContext.home'):

```
pipette = protocol.load_instrument("flex_1channel_1000", "right")
pipette.home()

```

To home a specific pipette’s plunger only, you can call [`InstrumentContext.home_plunger()`](index.html#opentrons.protocol_api.InstrumentContext.home_plunger 'opentrons.protocol_api.InstrumentContext.home_plunger'):

```
pipette = protocol.load_instrument("flex_1channel_1000", "right")
pipette.home_plunger()

```

New in version 2\.0\.

#### Comment

Call the [`ProtocolContext.comment()`](index.html#opentrons.protocol_api.ProtocolContext.comment 'opentrons.protocol_api.ProtocolContext.comment') method if you want to write and display a brief message in the Opentrons App during a protocol run:

```
protocol.comment("Hello, world!")

```

New in version 2\.0\.

#### Control and Monitor Robot Rail Lights

Call the [`ProtocolContext.set_rail_lights()`](index.html#opentrons.protocol_api.ProtocolContext.set_rail_lights 'opentrons.protocol_api.ProtocolContext.set_rail_lights') method to turn the robot’s rail lights on or off during a protocol. This method accepts Boolean `True` (lights on) or `False` (lights off) arguments. Rail lights are off by default.

This example turns the rail lights on:

```
protocol.set_rail_lights(True)

```

This example turns the rail lights off:

```
protocol.set_rail_lights(False)

```

New in version 2\.5\.

You can also check whether the rail lights are on or off in the protocol by using [`ProtocolContext.rail_lights_on`](index.html#opentrons.protocol_api.ProtocolContext.rail_lights_on 'opentrons.protocol_api.ProtocolContext.rail_lights_on'). This method returns `True` when lights are on and `False` when the lights are off.

New in version 2\.5\.

#### OT\-2 Door Safety Switch

Introduced with [robot software version](index.html#version-table) 3\.19, the safety switch feature prevents the OT\-2, and your protocol, from running if the door is open. To operate properly, the front door and top window of your OT\-2 must be closed. You can toggle the door safety switch on or off from **Robot Settings \> Advanced \> Usage Settings**.

To check if the robot’s door is closed at a specific point during a protocol run, call [`ProtocolContext.door_closed`](index.html#opentrons.protocol_api.ProtocolContext.door_closed 'opentrons.protocol_api.ProtocolContext.door_closed'). It returns a Boolean `True` (door closed) or `False` (door open) response.

```
protocol.door_closed

```

Warning

[`door_closed`](index.html#opentrons.protocol_api.ProtocolContext.door_closed 'opentrons.protocol_api.ProtocolContext.door_closed') is a status check only. It does not control the robot’s behavior. If you wish to implement a custom method to pause or resume a protocol using `door_closed`, disable the door safety feature first (not recommended).

New in version 2\.5\.

Building block commands execute some of the most basic actions that your robot can complete. But basic doesn’t mean these commands lack capabilities. They perform important tasks in your protocols. They’re also foundational to the [complex commands](index.html#v2-complex-commands) that help you combine multiple actions into fewer lines of code.

Pages in this section of the documentation cover:

- [Manipulating Pipette Tips](index.html#pipette-tips): Get started with commands for picking up pipette tips, dropping tips, returning tips, and working with used tips.
- [Liquid Control](index.html#liquid-control): Learn about aspirating and dispensing liquids, blow out and touch tip procedures, mixing, and creating air gaps.
- [Utility Commands](index.html#new-utility-commands): Control various robot functions such as pausing or delaying a protocol, checking the robot’s door, turning robot lights on/off, and more.

## Complex Commands

### Sources and Destinations

The [`InstrumentContext.transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer'), [`InstrumentContext.distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute'), and [`InstrumentContext.consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') methods form the family of complex liquid handling commands. These methods require `source` and `dest` (destination) arguments to move liquid from one well, or group of wells, to another. In contrast, the [building block commands](index.html#v2-atomic-commands) [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate') and [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') only operate in a single location.

For example, this command performs a simple transfer between two wells on a plate:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["A2"],
)

```

New in version 2\.0\.

This page covers the restrictions on sources and destinations for complex commands, their different patterns of aspirating and dispensing, and how to optimize them for different use cases.

#### Source and Destination Arguments

As noted above, the [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer'), [`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute'), and [`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') methods require `source` and `dest` (destination) arguments to aspirate and dispense liquid. However, each method handles liquid sources and destinations differently. Understanding how complex commands work with source and destination wells is essential to using these methods effectively.

[`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') is the most versatile complex liquid handling function, because it has the fewest restrictions on what wells it can operate on. You will likely use transfer commands in many of your protocols.

Certain liquid handling cases focus on moving liquid to or from a single well. [`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute') limits its source to a single well, while [`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') limits its destination to a single well. Distribute commands also make changes to liquid\-handling behavior to improve the accuracy of dispensing.

The following table summarizes the source and destination restrictions for each method.

| Method          | Accepted wells                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transfer()`    | _ **Source:** Any number of wells. _ **Destination:** Any number of wells. \* The larger group of wells must be evenly divisible by the smaller group. |
| `distribute()`  | _ **Source:** Exactly one well. _ **Destination:** Any number of wells.                                                                                |
| `consolidate()` | _ **Source:** Any number of wells. _ **Destination:** Exactly one well.                                                                                |

A single well can be passed by itself or as a list with one item: `source=plate["A1"]` and `source=[plate["A1"]]` are equivalent.

The section on [many\-to\-many transfers](#many-to-many) below covers how `transfer()` works when specifying sources and destinations of different sizes. However, if they don’t meet the even divisibility requirement, the API will raise an error. You can work around such situations by making multiple calls to `transfer()` in sequence or by using a [list of volumes](index.html#complex-list-volumes) to skip certain wells.

For distributing and consolidating, the API will not raise an error if you use a list of wells as the argument that is limited to exactly one well. Instead, the API will ignore everything except the first well in the list. For example, the following command will only aspirate from well A1:

```
pipette.distribute(
    volume=100,
    source=[plate["A1"], plate["A2"]],  # A2 ignored
    dest=plate.columns()[1],
)

```

On the other hand, a transfer command with the same arguments would aspirate from both A1 and A2\. The next section examines the exact order of aspiration and dispensing for all three methods.

#### Transfer Patterns

Each complex command uses a different pattern of aspiration and dispensing. In addition, when you provide multiple wells as both the source and destination for `transfer()`, it maps the source list onto the destination list in a certain way.

##### Aspirating and Dispensing

`transfer()` always alternates between aspirating and dispensing, regardless of how many wells are in the source and destination. Its default behavior is:

> 1. Pick up a tip.
> 2. Aspirate from the first source well.
> 3. Dispense in the first destination well.
> 4. Repeat the pattern of aspirating and dispensing, as needed.
> 5. Drop the tip in the trash.

This transfer aspirates six times and dispenses six times.

`distribute()` always fills the tip with as few aspirations as possible, and then dispenses to the destination wells in order. Its default behavior is:

> 1. Pick up a tip.
> 2. Aspirate enough to dispense in all the destination wells. This aspirate includes a disposal volume.
> 3. Dispense in the first destination well.
> 4. Continue to dispense in destination wells.
> 5. Drop the tip in the trash.

See [Tip Refilling](index.html#complex-tip-refilling) below for cases where the total amount to be dispensed is greater than the capacity of the tip.

This distribute aspirates one time and dispenses three times.

`consolidate()` aspirates multiple times in a row, and then dispenses as few times as possible in the destination well. Its default behavior is:

> 1. Pick up a tip.
> 2. Aspirate from the first source well.
> 3. Continue aspirating from source wells.
> 4. Dispense in the destination well.
> 5. Drop the tip in the trash.

See [Tip Refilling](index.html#complex-tip-refilling) below for cases where the total amount to be aspirated is greater than the capacity of the tip.

This consolidate aspirates three times and dispenses one time.

Note

By default, all three commands begin by picking up a tip and conclude by dropping a tip. In general, don’t call [`pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') just before a complex command, or the API will raise an error. You can override this behavior with the [tip handling complex parameter](index.html#param-tip-handling), by setting `new_tip="never"`.

##### Many\-to\-Many

`transfer()` lets you specify both `source` and `dest` arguments that contain multiple wells. This section covers how the method determines which wells to aspirate from and dispense to in these cases.

When the source and destination both contain the same number of wells, the mapping between wells is straightforward. You can imagine writing out the two lists one above each other, with each unique well in the source list paired to a unique well in the destination list. For example, here is the code for using one row as the source and another row as the destination, and the resulting correspondence between wells:

```
pipette.transfer(
    volume=50,
    source=plate.rows()[0],
    dest=plate.rows()[1],
)

```

| Source      | A1  | A2  | A3  | A4  | A5  | A6  | A7  | A8  | A9  | A10 | A11 | A12 |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Destination | B1  | B2  | B3  | B4  | B5  | B6  | B7  | B8  | B9  | B10 | B11 | B12 |

There’s no requirement that the source and destination lists be mutually exclusive. In fact, this command adapted from the [tutorial](index.html#tutorial) deliberately uses slices of the same list, saved to the variable `row`, with the effect that each aspiration happens in the same location as the previous dispense:

```
row = plate.rows()[0]
pipette.transfer(
    volume=50,
    source=row[:11],
    dest=row[1:],
)

```

| Source      | A1  | A2  | A3  | A4  | A5  | A6  | A7  | A8  | A9  | A10 | A11 |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Destination | A2  | A3  | A4  | A5  | A6  | A7  | A8  | A9  | A10 | A11 | A12 |

When the source and destination lists contain different numbers of wells, `transfer()` will always aspirate and dispense as many times as there are wells in the _longer_ list. The shorter list will be “stretched” to cover the length of the longer list. Here is an example of transferring from 3 wells to a full row of 12 wells:

```
pipette.transfer(
    volume=50,
    source=[plate["A1"], plate["A2"], plate["A3"]],
    dest=plate.rows()[1],
)

```

| Source      | A1  | A1  | A1  | A1  | A2  | A2  | A2  | A2  | A3  | A3  | A3  | A3  |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Destination | B1  | B2  | B3  | B4  | B5  | B6  | B7  | B8  | B9  | B10 | B11 | B12 |

This is why the longer list must be evenly divisible by the shorter list. Changing the destination in this example to a column instead of a row will cause the API to raise an error, because 8 is not evenly divisible by 3:

```
pipette.transfer(
    volume=50,
    source=[plate["A1"], plate["A2"], plate["A3"]],
    dest=plate.columns()[3],  # labware column 4
)
# error: source and destination lists must be divisible

```

The API raises this error rather than presuming which wells to aspirate from three times and which only two times. If you want to aspirate three times from A1, three times from A2, and two times from A3, use multiple `transfer()` commands in sequence:

```
pipette.transfer(50, plate["A1"], plate.columns()[3][:3])
pipette.transfer(50, plate["A2"], plate.columns()[3][3:6])
pipette.transfer(50, plate["A3"], plate.columns()[3][6:])

```

Finally, be aware of the ordering of source and destination lists when constructing them with [well accessor methods](index.html#well-accessor-methods). For example, at first glance this code may appear to take liquid from each well in the first row of a plate and move it to each of the other wells in the same column:

```
pipette.transfer(
    volume=20,
    source=plate.rows()[0],
    dest=plate.rows()[1:],
)

```

However, because the well ordering of [`Labware.rows()`](index.html#opentrons.protocol_api.Labware.rows 'opentrons.protocol_api.Labware.rows') goes _across_ the plate instead of _down_ the plate, liquid from A1 will be dispensed in B1–B7, liquid from A2 will be dispensed in B8–C2, etc. The intended task is probably better accomplished by repeating transfers in a `for` loop:

```
for i in range(12):
    pipette.transfer(
        volume=20,
        source=plate.rows()[0][i],
        dest=plate.columns()[i][1:],
    )

```

Here the repeat index `i` picks out:

> - The individual well in the first row, for the source.
> - The corresponding column, which is sliced to form the destination.

##### Optimizing Patterns

Choosing the right complex command optimizes gantry movement and helps save time in your protocol. For example, say you want to take liquid from a reservoir and put 50 µL in each well of the first row of a plate. You could use `transfer()`, like this:

```
pipette.transfer(
    volume=50,
    source=reservoir["A1"],
    destination=plate.rows()[0],
)

```

This will produce 12 aspirate steps and 12 dispense steps. The steps alternate, with the pipette moving back and forth between the reservoir and plate each time. Using `distribute()` with the same arguments is more optimal in this scenario:

```
pipette.distribute(
    volume=50,
    source=reservoir["A1"],
    destination=plate.rows()[0],
)

```

This will produce _just 1_ aspirate step and 12 dispense steps (when using a 1000 µL pipette). The pipette will aspirate enough liquid to fill all the wells, plus a disposal volume. Then it will move to A1 of the plate, dispense, move the short distance to A2, dispense, and so on. This greatly reduces gantry movement and the time to perform this action. And even if you’re using a smaller pipette, `distribute()` will fill the pipette, dispense as many times as possible, and only then return to the reservoir to refill (see [Tip Refilling](index.html#complex-tip-refilling) for more information).

### Order of Operations

Complex commands perform a series of [building block commands](index.html#v2-atomic-commands) in order. In fact, the run preview for your protocol in the Opentrons App lists all of these commands as separate steps. This lets you examine what effect your complex commands will have before running them.

This page describes what steps you should expect the robot to perform when using different complex commands with different required and [optional](index.html#complex-params) parameters.

#### Step Sequence

The order of steps is fixed within complex commands. Aspiration and dispensing are the only required actions. You can enable or disable all of the other actions with [complex liquid handling parameters](index.html#complex-params). A complex command designed to perform every possible action will proceed in this order:

> 1. Pick up tip
> 2. Mix at source
> 3. Aspirate from source
> 4. Touch tip at source
> 5. Air gap
> 6. Dispense into destination
> 7. Mix at destination
> 8. Touch tip at destination
> 9. Blow out
> 10. Drop tip

The command may repeat some or all of these steps in order to move liquid as requested. [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') repeats as many times as there are wells in the longer of its `source` or `dest` argument. [`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute') and [`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') try to repeat as few times as possible. See [Tip Refilling](#complex-tip-refilling) below for how they behave when they do need to repeat.

#### Example Orders

The smallest possible number of steps in a complex command is just two: aspirating and dispensing. This is possible by omitting the tip pickup and drop steps:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["B1"],
    new_tip="never",
)

```

Here’s another example, a distribute command that adds touch tip steps (and does not turn off tip handling). The code for this command is:

```
pipette.distribute(
    volume=100,
    source=[plate["A1"]],
    dest=[plate["B1"], plate["B2"]],
    touch_tip=True,
)

```

Compared to the list of all possible actions, this code will only perform the following:

> 1. Pick up tip
> 2. Aspirate from source
> 3. Touch tip at source
> 4. Dispense into destination
> 5. Touch tip at destination
> 6. Blow out
> 7. Drop tip

Let’s unpack this. Picking up and dropping tips is default behavior for `distribute()`. Specifying `touch_tip=True` adds two steps, as it is performed at both the source and destination. And it’s also default behavior for `distribute()` to aspirate a disposal volume, which is blown out before dropping the tip. The exact order of steps in the run preview should look similar to this:

```
Picking up tip from A1 of tip rack on 3
Aspirating 220.0 uL from A1 of well plate on 2 at 92.86 uL/sec
Touching tip
Dispensing 100.0 uL into B1 of well plate on 2 at 92.86 uL/sec
Touching tip
Dispensing 100.0 uL into B2 of well plate on 2 at 92.86 uL/sec
Touching tip
Blowing out at A1 of Opentrons Fixed Trash on 12
Dropping tip into A1 of Opentrons Fixed Trash on 12

```

Since dispensing and touching the tip are both associated with the destination wells, those steps are performed at each of the two destination wells.

#### Tip Refilling

One factor that affects the exact order of steps for a complex command is whether the amount of liquid being moved can fit in the tip at once. If it won’t fit, you don’t have to adjust your command. The API will handle it for you by including additional steps to refill the tip when needed.

For example, say you need to move 100 µL of liquid from one well to another, but you only have a 50 µL pipette attached to your robot. To accomplish this with building block commands, you’d need multiple aspirates and dispenses. `aspirate(volume=100)` would raise an error, since it exceeds the tip’s volume. But you can accomplish this with a single transfer command:

```
pipette50.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["B1"],
)

```

To effect the transfer, the API will aspirate and dispense the maximum volume of the pipette (50 µL) twice:

```
Picking up tip from A1 of tip rack on D3
Aspirating 50.0 uL from A1 of well plate on D2 at 57 uL/sec
Dispensing 50.0 uL into B1 of well plate on D2 at 57 uL/sec
Aspirating 50.0 uL from A1 of well plate on D2 at 57 uL/sec
Dispensing 50.0 uL into B1 of well plate on D2 at 57 uL/sec
Dropping tip into A1 of Opentrons Fixed Trash on A3

```

You can change `volume` to any value (above the minimum volume of the pipette) and the API will automatically calculate how many times the pipette needs to aspirate and dispense. `volume=50` would require just one repetition. `volume=75` would require two, split into 50 µL and 25 µL. `volume=1000` would repeat 20 times — not very efficient, but perhaps more useful than having to swap to a different pipette!

Remember that `distribute()` includes a disposal volume by default, and this can affect the number of times the pipette refills its tip. Say you want to distribute 80 µL to each of the 12 wells in row A of a plate. That’s 960 µL total — less than the capacity of the pipette — but the 100 µL disposal volume will cause the pipette to refill.

```
Picking up tip from A1 of tip rack on 3
Aspirating 980.0 uL from A1 of well plate on 2 at 274.7 uL/sec
Dispensing 80.0 uL into B1 of well plate on 2 at 274.7 uL/sec
Dispensing 80.0 uL into B2 of well plate on 2 at 274.7 uL/sec
...
Dispensing 80.0 uL into B11 of well plate on 2 at 274.7 uL/sec
Blowing out at A1 of Opentrons Fixed Trash on 12
Aspirating 180.0 uL from A1 of well plate on 2 at 274.7 uL/sec
Dispensing 80.0 uL into B12 of well plate on 2 at 274.7 uL/sec
Blowing out at A1 of Opentrons Fixed Trash on 12
Dropping tip into A1 of Opentrons Fixed Trash on 12

```

This command will blow out 200 total µL of liquid in the trash. If you need to conserve liquid, use [complex liquid handling parameters](index.html#complex-params) to reduce or eliminate the [disposal volume](index.html#param-disposal-volume), or to [blow out](index.html#param-blow-out) in a location other than the trash.

#### List of Volumes

Complex commands can aspirate or dispense different amounts for different wells, rather than the same amount across all wells. To do this, set the `volume` parameter to a list of volumes instead of a single number. The list must be the same length as the longer of `source` or `dest`, or the API will raise an error. For example, this command transfers a different amount of liquid into each of wells B1, B2, and B3:

```
pipette.transfer(
    volume=[20, 40, 60],
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"], plate["B3"]],
)

```

Setting any item in the list to `0` will skip aspirating and dispensing for the corresponding well. This example takes the command from above and skips B2:

```
pipette.transfer(
    volume=[20, 0, 60],
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"], plate["B3"]],
)

```

The pipette dispenses in B1 and B3, and does not move to B2 at all.

```
Picking up tip from A1 of tip rack on 3
Aspirating 20.0 uL from A1 of well plate on 2 at 274.7 uL/sec
Dispensing 20.0 uL into B1 of well plate on 2 at 274.7 uL/sec
Aspirating 60.0 uL from A1 of well plate on 2 at 274.7 uL/sec
Dispensing 60.0 uL into B3 of well plate on 2 at 274.7 uL/sec
Dropping tip into A1 of Opentrons Fixed Trash on 12

```

This is such a simple example that you might prefer to use two `transfer()` commands instead. Lists of volumes become more useful when they are longer than a couple elements. For example, you can specify `volume` as a list with 96 items and `dest=plate.wells()` to individually control amounts to dispense (and wells to skip) across an entire plate.

Note

When the optional `new_tip` parameter is set to `"always"`, the pipette will pick up and drop a tip even for skipped wells. If you don’t want to waste tips, pre\-process your list of sources or destinations and use the result as the argument of your complex command.

New in version 2\.0: Skip wells for `transfer()` and `distribute()`.

New in version 2\.8: Skip wells for `consolidate()`.

### Complex Liquid Handling Parameters

Complex commands accept a number of optional parameters that give you greater control over the exact steps they perform.

This page describes the accepted values and behavior of each parameter. The parameters are organized in the order that they first add a step. Some parameters, such as `touch_tip`, add multiple steps. See [Order of Operations](index.html#complex-command-order) for more details on the sequence of steps performed by complex commands.

The API reference entry for [`InstrumentContext.transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') also lists the parameters and has more information on their implementation as keyword arguments.

#### Tip Handling

The `new_tip` parameter controls if and when complex commands pick up new tips from the pipette’s tip racks. It has three possible values:

| Value      | Behavior                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `"once"`   | _ Pick up a tip at the start of the command. _ Use the tip for all liquid handling. \* Drop the tip at the end of the command. |
| `"always"` | Pick up and drop a tip for each set of aspirate and dispense steps.                                                            |
| `"never"`  | Do not pick up or drop tips at all.                                                                                            |

`"once"` is the default behavior for all complex commands.

New in version 2\.0\.

##### Tip Handling Requirements

`"once"` and `"always"` require that the pipette has an [associated tip rack](index.html#pipette-tip-racks), or the API will raise an error (because it doesn’t know where to pick up a tip from). If the pipette already has a tip attached, the API will also raise an error when it tries to pick up a tip.

```
pipette.pick_up_tip()
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"], plate["B3"]],
    new_tip="never",  # "once", "always", or None will error
)

```

Conversely, `"never"` requires that the pipette has picked up a tip, or the API will raise an error (because it will attempt to aspirate without a tip attached).

##### Avoiding Cross\-Contamination

One reason to set `new_tip="always"` is to avoid cross\-contamination between wells. However, you should always do a dry run of your protocol to test that the pipette is picking up and dropping tips in the way that your application requires.

[`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') will pick up a new tip before _every_ aspirate when `new_tip="always"`. This includes when [tip refilling](index.html#complex-tip-refilling) requires multiple aspirations from a single source well.

[`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute') and [`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') only pick up one tip, even when `new_tip="always"`. For example, this distribute command returns to the source well a second time, because the amount to be distributed (400 µL total plus disposal volume) exceeds the pipette capacity (300 µL):

```
pipette.distribute(
    volume=200,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"]],
    new_tip="always",
)

```

But it _does not_ pick up a new tip after dispensing into B1:

```
Picking up tip from A1 of tip rack on 3
Aspirating 220.0 uL from A1 of well plate on 2 at 92.86 uL/sec
Dispensing 200.0 uL into B1 of well plate on 2 at 92.86 uL/sec
Blowing out at A1 of Opentrons Fixed Trash on 12
Aspirating 220.0 uL from A1 of well plate on 2 at 92.86 uL/sec
Dispensing 200.0 uL into B2 of well plate on 2 at 92.86 uL/sec
Blowing out at A1 of Opentrons Fixed Trash on 12
Dropping tip into A1 of Opentrons Fixed Trash on 12

```

If this poses a contamination risk, you can work around it in a few ways:

> - Use `transfer()` with `new_tip="always"` instead.
> - Set [`well_bottom_clearance`](index.html#opentrons.protocol_api.InstrumentContext.well_bottom_clearance 'opentrons.protocol_api.InstrumentContext.well_bottom_clearance') high enough that the tip doesn’t contact liquid in the destination well.
> - Use [building block commands](index.html#v2-atomic-commands) instead of complex commands.

#### Mix Before

The `mix_before` parameter controls mixing in source wells before each aspiration. Its value must be a [`tuple`](https://docs.python.org/3/library/stdtypes.html#tuple '(in Python v3.12)') with two numeric values. The first value is the number of repetitions, and the second value is the amount of liquid to mix in µL.

For example, this transfer command will mix 50 µL of liquid 3 times before each of its aspirations:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"]],
    mix_before=(3, 50),
)

```

New in version 2\.0\.

Mixing occurs before every aspiration, including when [tip refilling](index.html#complex-tip-refilling) is required.

Note

[`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') ignores any value of `mix_before`. Mixing on the second and subsequent aspirations of a consolidate command would defeat its purpose: to aspirate multiple times in a row, from different wells, _before_ dispensing.

#### Disposal Volume

The `disposal_volume` parameter controls how much extra liquid is aspirated as part of a [`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute') command. Including a disposal volume can improve the accuracy of each dispense. The pipette blows out the disposal volume of liquid after dispensing. To skip aspirating and blowing out extra liquid, set `disposal_volume=0`.

By default, `disposal_volume` is the [minimum volume](index.html#new-pipette-models) of the pipette, but you can set it to any amount:

```
pipette.distribute(
    volume=100,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"]],
    disposal_volume=10,  # reduce from default 20 µL to 10 µL
)

```

New in version 2\.0\.

If the amount to aspirate plus the disposal volume exceeds the tip’s capacity, `distribute()` will use a [tip refilling strategy](index.html#complex-tip-refilling). In such cases, the pipette will aspirate and blow out the disposal volume _for each aspiration_. For example, this command will require tip refilling with a 1000 µL pipette:

```
pipette.distribute(
    volume=120,
    source=reservoir["A1"],
    dest=[plate.columns()[0]],
    disposal_volume=50,
)

```

The amount to dispense in the destination is 960 µL (120 µL for each of 8 wells in the column). Adding the 50 µL disposal volume exceeds the 1000 µL capacity of the tip. The command will be split across two aspirations, each with the full disposal volume of 50 µL. The pipette will dispose _a total of 100 µL_ during the command.

Note

[`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') will not aspirate additional liquid if you set `disposal_volume`. However, it will perform a very small blow out after each dispense.

[`consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate') ignores `disposal_volume` completely.

#### Touch Tip

The `touch_tip` parameter accepts a Boolean value. When `True`, a touch tip step occurs after every aspirate and dispense.

For example, this transfer command aspirates, touches the tip at the source, dispenses, and touches the tip at the destination:

```
pipette.transfer(
    volume=100,
    dest=plate["A1"],
    source=plate["B1"],
    touch_tip=True,
)

```

New in version 2\.0\.

Touch tip occurs after every aspiration, including when [tip refilling](index.html#complex-tip-refilling) is required.

This parameter always uses default motion behavior for touch tip. Use the [touch tip building block command](index.html#touch-tip) if you need to:

> - Only touch the tip after aspirating or dispensing, but not both.
> - Control the speed, radius, or height of the touch tip motion.

#### Air Gap

The `air_gap` parameter controls how much air to aspirate and hold in the bottom of the tip when it contains liquid. The parameter’s value is the amount of air to aspirate in µL.

Air\-gapping behavior is different for each complex command. The different behaviors all serve the same purpose, which is to never leave the pipette holding liquid at the very bottom of the tip. This helps keep liquids from seeping out of the pipette.

| Method          | Air\-gapping behavior                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `transfer()`    | _ Air gap after each aspiration. _ Pipette is empty after dispensing.                                                   |
| `distribute()`  | _ Air gap after each aspiration. _ Air gap after dispensing if the pipette isn’t empty.                                 |
| `consolidate()` | _ Air gap after each aspiration. This may create multiple air gaps within the tip. _ Pipette is empty after dispensing. |

For example, this transfer command will create a 20 µL air gap after each of its aspirations. When dispensing, it will clear the air gap and dispense the full 100 µL of liquid:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["B1"],
    air_gap=20,
)

```

New in version 2\.0\.

When consolidating, air gaps still occur after every aspiration. In this example, the tip will use 210 µL of its capacity (50 µL of liquid followed by 20 µL of air, repeated three times):

```
pipette.consolidate(
    volume=50,
    source=[plate["A1"], plate["A2"], plate["A3"]],
    dest=plate["B1"],
    air_gap=20,
)

```

```
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

```

If adding an air gap would exceed the pipette’s maximum volume, the complex command will use a [tip refilling strategy](index.html#complex-tip-refilling). For example, this command uses a 300 µL pipette to transfer 300 µL of liquid plus an air gap:

```
pipette.transfer(
    volume=300,
    source=plate["A1"],
    dest=plate["B1"],
    air_gap=20,
)

```

As a result, the transfer is split into two aspirates of 150 µL, each with their own 20 µL air gap:

```
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

```

#### Mix After

The `mix_after` parameter controls mixing in source wells after each dispense. Its value must be a [`tuple`](https://docs.python.org/3/library/stdtypes.html#tuple '(in Python v3.12)') with two numeric values. The first value is the number of repetitions, and the second value is the amount of liquid to mix in µL.

For example, this transfer command will mix 50 µL of liquid 3 times after each of its dispenses:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"]],
    mix_after=(3, 50),
)

```

New in version 2\.0\.

Note

[`distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute') ignores any value of `mix_after`. Mixing after dispensing would combine (and potentially contaminate) the remaining source liquid with liquid present at the destination.

#### Blow Out

There are two parameters that control whether and where the pipette blows out liquid. The `blow_out` parameter accepts a Boolean value. When `True`, the pipette blows out remaining liquid when the tip is empty or only contains the disposal volume. The `blowout_location` parameter controls in which of three locations these blowout actions occur. The default blowout location is the trash. Blowout behavior is different for each complex command.

| Method          | Blowout behavior and location                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `transfer()`    | _ Blow out after each dispense. _ Valid locations: `"trash"`, `"source well"`, `"destination well"` |
| `distribute()`  | _ Blow out after the final dispense. _ Valid locations: `"trash"`, `"source well"`                  |
| `consolidate()` | _ Blow out after the only dispense. _ Valid locations: `"trash"`, `"destination well"`              |

For example, this transfer command will blow out liquid in the trash twice, once after each dispense into a destination well:

```
pipette.transfer(
    volume=100,
    source=[plate["A1"], plate["A2"]],
    dest=[plate["B1"], plate["B2"]],
    blow_out=True,
)

```

New in version 2\.0\.

Set `blowout_location` when you don’t want to waste any liquid by blowing it out into the trash. For example, you may want to make sure that every last bit of a sample is moved into a destination well. Or you may want to return every last bit of an expensive reagent to the source for use in later pipetting.

If you need to blow out in a different well, or at a specific location within a well, use the [blow out building block command](index.html#blow-out) instead.

When setting a blowout location, you _must_ also set `blow_out=True`, or the location will be ignored:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["B1"],
    blow_out=True,  # required to set location
    blowout_location="destination well",
)

```

New in version 2\.8\.

With `transfer()`, the pipette will not blow out at all if you only set `blowout_location`.

`blow_out=True` is also required for distribute commands that blow out by virtue of having a disposal volume:

```
pipette.distribute(
    volume=100,
    source=plate["A1"],
    dest=[plate["B1"], plate["B2"]],
    disposal_volume=50,  # causes blow out
    blow_out=True,       # still required to set location!
    blowout_location="source well",
)

```

With `distribute()`, the pipette will still blow out if you only set `blowout_location`, but in the default location of the trash.

Note

If the tip already contains liquid before the complex command, the default blowout location will shift away from the trash. `transfer()` and `distribute()` shift to the source well, and `consolidate()` shifts to the destination well. For example, this transfer command will blow out in well B1 because it’s the source:

```
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

```

This only occurs when you aspirate and then perform a complex command with `new_tip="never"` and `blow_out=True`.

#### Trash Tips

The `trash` parameter controls what the pipette does with tips at the end of complex commands. When `True`, the pipette drops tips into the trash. When `False`, the pipette returns tips to their original locations in their tip rack.

The default is `True`, so you only have to set `trash` when you want the tip\-returning behavior:

```
pipette.transfer(
    volume=100,
    source=plate["A1"],
    dest=plate["B1"],
    trash=False,
)

```

New in version 2\.0\.

Complex liquid handling commands combine multiple [building block commands](index.html#v2-atomic-commands) into a single method call. These commands make it easier to handle larger groups of wells and repeat actions without having to write your own control flow code. They integrate tip\-handling behavior and can pick up, use, and drop multiple tips depending on how you want to handle your liquids. They can optionally perform other actions, like adding air gaps, knocking droplets off the tip, mixing, and blowing out excess liquid from the tip.

There are three complex liquid handling commands, each optimized for a different liquid handling scenario:

> - [`InstrumentContext.transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer')
> - [`InstrumentContext.distribute()`](index.html#opentrons.protocol_api.InstrumentContext.distribute 'opentrons.protocol_api.InstrumentContext.distribute')
> - [`InstrumentContext.consolidate()`](index.html#opentrons.protocol_api.InstrumentContext.consolidate 'opentrons.protocol_api.InstrumentContext.consolidate')

Pages in this section of the documentation cover:

> - [Sources and Destinations](index.html#complex-source-dest): Which wells complex commands aspirate from and dispense to.
> - [Order of Operations](index.html#complex-command-order): The order of basic commands that are part of a complex commmand.
> - [Complex Liquid Handling Parameters](index.html#complex-params): Additional keyword arguments that affect complex command behavior.

Code samples throughout these pages assume that you’ve loaded the pipettes and labware from the [basic protocol template](index.html#protocol-template).

## Labware and Deck Positions

The API automatically determines how the robot needs to move when working with the instruments and labware in your protocol. But sometimes you need direct control over these activities. The API lets you do just that. Specifically, you can control movements relative to labware and deck locations. You can also manage the gantry’s speed and trajectory as it traverses the working area. This document explains how to use API commands to take direct control of the robot and position it exactly where you need it.

### Position Relative to Labware

When the robot positions itself relative to a piece of labware, where it moves is determined by the labware definition, the actions you want it to perform, and the labware offsets for a specific deck slot. This section describes how these positional components are calculated and how to change them.

#### Top, Bottom, and Center

Every well on every piece of labware has three addressable positions: top, bottom, and center. The position is determined by the labware definition and what the labware is loaded on top of. You can use these positions as\-is or calculate other positions relative to them.

##### Top

Let’s look at the [`Well.top()`](index.html#opentrons.protocol_api.Well.top 'opentrons.protocol_api.Well.top') method. It returns a position level with the top of the well, centered in both horizontal directions.

```
plate["A1"].top()  # the top center of the well

```

This is a good position to use for a [blow out operation](index.html#new-blow-out) or an activity where you don’t want the tip to contact the liquid. In addition, you can adjust the height of this position with the optional argument `z`, which is measured in mm. Positive `z` numbers move the position up, negative `z` numbers move it down.

```
plate["A1"].top(z=1)  # 1 mm above the top center of the well
plate["A1"].top(z=-1) # 1 mm below the top center of the well

```

New in version 2\.0\.

##### Bottom

Let’s look at the [`Well.bottom()`](index.html#opentrons.protocol_api.Well.bottom 'opentrons.protocol_api.Well.bottom') method. It returns a position level with the bottom of the well, centered in both horizontal directions.

```
plate["A1"].bottom()  # the bottom center of the well

```

This is a good position for [aspirating liquid](index.html#new-aspirate) or an activity where you want the tip to contact the liquid. Similar to the `Well.top()` method, you can adjust the height of this position with the optional argument `z`, which is measured in mm. Positive `z` numbers move the position up, negative `z` numbers move it down.

```
plate["A1"].bottom(z=1)  # 1 mm above the bottom center of the well
plate["A1"].bottom(z=-1) # 1 mm below the bottom center of the well
                         # this may be dangerous!

```

Warning

Negative `z` arguments to `Well.bottom()` will cause the pipette tip to collide with the bottom of the well. Collisions may bend the tip (affecting liquid handling) and the pipette may be higher than expected on the z\-axis until it picks up another tip.

Flex can detect collisions, and even gentle contact may trigger an overpressure error and cause the protocol to fail. Avoid `z` values less than 1, if possible.

The OT\-2 has no sensors to detect contact with a well bottom. The protocol will continue even after a collision.

New in version 2\.0\.

##### Center

Let’s look at the [`Well.center()`](index.html#opentrons.protocol_api.Well.center 'opentrons.protocol_api.Well.center') method. It returns a position centered in the well both vertically and horizontally. This can be a good place to start for precise control of positions within the well for unusual or custom labware.

```
plate["A1"].center() # the vertical and horizontal center of the well

```

New in version 2\.0\.

#### Default Positions

By default, your robot will aspirate and dispense 1 mm above the bottom of wells. This default clearance may not be suitable for some labware geometries, liquids, or protocols. You can change this value by using the [`Well.bottom()`](index.html#opentrons.protocol_api.Well.bottom 'opentrons.protocol_api.Well.bottom') method with the `z` argument, though it can be cumbersome to do so repeatedly.

If you need to change the aspiration or dispensing height for multiple operations, specify the distance in mm from the well bottom with the [`InstrumentContext.well_bottom_clearance`](index.html#opentrons.protocol_api.InstrumentContext.well_bottom_clearance 'opentrons.protocol_api.InstrumentContext.well_bottom_clearance') object. It has two attributes: `well_bottom_clearance.aspirate` and `well_bottom_clearance.dispense`. These change the aspiration height and dispense height, respectively.

Modifying these attributes will affect all subsequent aspirate and dispense actions performed by the attached pipette, even those executed as part of a [`transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') operation. This snippet from a sample protocol demonstrates how to work with and change the default clearance:

```
# aspirate 1 mm above the bottom of the well (default)
pipette.aspirate(50, plate["A1"])
# dispense 1 mm above the bottom of the well (default)
pipette.dispense(50, plate["A1"])

# change clearance for aspiration to 2 mm
pipette.well_bottom_clearance.aspirate = 2
# aspirate 2 mm above the bottom of the well
pipette.aspirate(50, plate["A1"])
# still dispensing 1 mm above the bottom
pipette.dispense(50, plate["A1"])

pipette.aspirate(50, plate["A1"])
# change clearance for dispensing to 10 mm
pipette.well_bottom_clearance.dispense = 10
# dispense high above the well
pipette.dispense(50, plate["A1"])

```

New in version 2\.0\.

### Using Labware Position Check

All positions relative to labware are adjusted automatically based on labware offset data. Calculate labware offsets by running Labware Position Check during protocol setup, either in the Opentrons App or on the Flex touchscreen. Version 6\.0\.0 and later of the robot software can apply previously calculated offsets on the same robot for the same labware type and deck slot, even across different protocols.

You should only adjust labware offsets in your Python code if you plan to run your protocol in Jupyter Notebook or from the command line. See [Setting Labware Offsets](index.html#using-lpc) in the Advanced Control article for information.

### Position Relative to Trash Containers

Movement to [`TrashBin`](index.html#opentrons.protocol_api.TrashBin 'opentrons.protocol_api.TrashBin') or [`WasteChute`](index.html#opentrons.protocol_api.WasteChute 'opentrons.protocol_api.WasteChute') objects is based on the horizontal _center_ of the pipette. This is different than movement to labware, which is based on the primary channel (the back channel on 8\-channel pipettes, and the back\-left channel on 96\-channel pipettes in default configuration). Using the center of the pipette ensures that all attached tips are over the trash container for blowing out, dropping tips, or other disposal operations.

Note

In API version 2\.15 and earlier, trash containers are [`Labware`](index.html#opentrons.protocol_api.Labware 'opentrons.protocol_api.Labware') objects that have a single well. See [`fixed_trash`](index.html#opentrons.protocol_api.ProtocolContext.fixed_trash 'opentrons.protocol_api.ProtocolContext.fixed_trash') and [Position Relative to Labware](#position-relative-labware) above.

You can adjust the position of the pipette center with the [`TrashBin.top()`](index.html#opentrons.protocol_api.TrashBin.top 'opentrons.protocol_api.TrashBin.top') and [`WasteChute.top()`](index.html#opentrons.protocol_api.WasteChute.top 'opentrons.protocol_api.WasteChute.top') methods. These methods allow adjustments along the x\-, y\-, and z\-axes. In contrast, `Well.top()`, [covered above](#well-top), only allows z\-axis adjustment. With no adjustments, the “top” position is centered on the x\- and y\-axes and is just below the opening of the trash container.

```
trash = protocol.load_trash_bin("A3")

trash  # pipette center just below trash top center
trash.top()  # same position
trash.top(z=10)  # 10 mm higher
trash.top(y=10)  # 10 mm towards back, default height

```

New in version 2\.18\.

Another difference between the trash container `top()` methods and `Well.top()` is that they return an object of the same type, not a [`Location`](index.html#opentrons.types.Location 'opentrons.types.Location'). This helps prevent performing undesired actions in trash containers. For example, you can [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate') at a location or from a well, but not from a trash container. On the other hand, you can [`blow_out()`](index.html#opentrons.protocol_api.InstrumentContext.blow_out 'opentrons.protocol_api.InstrumentContext.blow_out') at a location, well, trash bin, or waste chute.

### Position Relative to the Deck

The robot’s base coordinate system is known as _deck coordinates_. Many API functions use this coordinate system, and you can also reference it directly. It is a right\-handed coordinate system always specified in mm, with the origin `(0, 0, 0)` at the front left of the robot. The positive `x` direction is to the right, the positive `y` direction is to the back, and the positive `z` direction is up.

You can identify a point in this coordinate system with a [`types.Location`](index.html#opentrons.types.Location 'opentrons.types.Location') object, either as a standard Python [`tuple`](https://docs.python.org/3/library/stdtypes.html#tuple '(in Python v3.12)') of three floats, or as an instance of the [`namedtuple`](https://docs.python.org/3/library/collections.html#collections.namedtuple '(in Python v3.12)') [`types.Point`](index.html#opentrons.types.Point 'opentrons.types.Point').

Note

There are technically multiple vertical axes. For example, `z` is the axis of the left pipette mount and `a` is the axis of the right pipette mount. There are also pipette plunger axes: `b` (left) and `c` (right). You usually don’t have to refer to these axes directly, since most motion commands are issued to a particular pipette and the robot automatically selects the correct axis to move. Similarly, [`types.Location`](index.html#opentrons.types.Location 'opentrons.types.Location') only deals with `x`, `y`, and `z` values.

### Independent Movement

For convenience, many methods have location arguments and incorporate movement automatically. This section will focus on moving the pipette independently, without performing other actions like `aspirate()` or `dispense()`.

#### Move To

The [`InstrumentContext.move_to()`](index.html#opentrons.protocol_api.InstrumentContext.move_to 'opentrons.protocol_api.InstrumentContext.move_to') method moves a pipette to any reachable location on the deck. If the pipette has picked up a tip, it will move the end of the tip to that position; if it hasn’t, it will move the pipette nozzle to that position.

The [`move_to()`](index.html#opentrons.protocol_api.InstrumentContext.move_to 'opentrons.protocol_api.InstrumentContext.move_to') method requires the [`Location`](index.html#opentrons.types.Location 'opentrons.types.Location') argument. The location can be automatically generated by methods like `Well.top()` and `Well.bottom()` or one you’ve created yourself, but you can’t move a pipette to a well directly:

```
pipette.move_to(plate["A1"])              # error; can't move to a well itself
pipette.move_to(plate["A1"].bottom())     # move to the bottom of well A1
pipette.move_to(plate["A1"].top())        # move to the top of well A1
pipette.move_to(plate["A1"].bottom(z=2))  # move to 2 mm above the bottom of well A1
pipette.move_to(plate["A1"].top(z=-2))    # move to 2 mm below the top of well A1

```

When using `move_to()`, by default the pipette will move in an arc: first upwards, then laterally to a position above the target location, and finally downwards to the target location. If you have a reason for doing so, you can force the pipette to move in a straight line to the target location:

```
pipette.move_to(plate["A1"].top(), force_direct=True)

```

Warning

Moving without an arc runs the risk of the pipette colliding with objects on the deck. Be very careful when using this option, especially when moving longer distances.

Small, direct movements can be useful for working inside of a well, without having the tip exit and re\-enter the well. This code sample demonstrates how to move the pipette to a well, make direct movements inside that well, and then move on to a different well:

```
pipette.move_to(plate["A1"].top())
pipette.move_to(plate["A1"].bottom(1), force_direct=True)
pipette.move_to(plate["A1"].top(-2), force_direct=True)
pipette.move_to(plate["A2"].top())

```

New in version 2\.0\.

#### Points and Locations

When instructing the robot to move, it’s important to consider the difference between the [`Point`](index.html#opentrons.types.Point 'opentrons.types.Point') and [`Location`](index.html#opentrons.types.Location 'opentrons.types.Location') types.

- Points are ordered tuples or named tuples: `Point(10, 20, 30)`, `Point(x=10, y=20, z=30)`, and `Point(z=30, y=20, x=10)` are all equivalent.
- Locations are a higher\-order tuple that combines a point with a reference object: a well, a piece of labware, or `None` (the deck).

This distinction is important for the [`Location.move()`](index.html#opentrons.types.Location.move 'opentrons.types.Location.move') method, which operates on a location, takes a point as an argument, and outputs an updated location. To use this method, include `from opentrons import types` at the start of your protocol. The `move()` method does not mutate the location it is called on, so to perform an action at the updated location, use it as an argument of another method or save it to a variable. For example:

```
# get the location at the center of well A1
center_location = plate["A1"].center()

# get a location 1 mm right, 1 mm back, and 1 mm up from the center of well A1
adjusted_location = center_location.move(types.Point(x=1, y=1, z=1))

# aspirate 1 mm right, 1 mm back, and 1 mm up from the center of well A1
pipette.aspirate(50, adjusted_location)

# dispense at the same location
pipette.dispense(50, center_location.move(types.Point(x=1, y=1, z=1)))

```

Note

The additional `z` arguments of the `top()` and `bottom()` methods (see [Position Relative to Labware](#position-relative-labware) above) are shorthand for adjusting the top and bottom locations with `move()`. You still need to use `move()` to adjust these positions along the x\- or y\-axis:

```
# the following are equivalent
pipette.move_to(plate["A1"].bottom(z=2))
pipette.move_to(plate["A1"].bottom().move(types.Point(z=2)))

# adjust along the y-axis
pipette.move_to(plate["A1"].bottom().move(types.Point(y=2)))

```

New in version 2\.0\.

### Movement Speeds

In addition to instructing the robot where to move a pipette, you can also control the speed at which it moves. Speed controls can be applied either to all pipette motions or to movement along a particular axis.

Note

Like all mechanical systems, Opentrons robots have resonant frequencies that depend on their construction and current configuration. It’s possible to set a speed that causes your robot to resonate, producing louder sounds than typical operation. This is safe, but if you find it annoying, increase or decrease the speed slightly.

#### Gantry Speed

The robot’s gantry usually moves as fast as it can given its construction. The default speed for Flex varies between 300 and 350 mm/s. The OT\-2 default is 400 mm/s. However, some experiments or liquids may require slower movements. In this case, you can reduce the gantry speed for a specific pipette by setting [`InstrumentContext.default_speed`](index.html#opentrons.protocol_api.InstrumentContext.default_speed 'opentrons.protocol_api.InstrumentContext.default_speed') like this:

```
pipette.move_to(plate["A1"].top())  # move to the first well at default speed
pipette.default_speed = 100         # reduce pipette speed
pipette.move_to(plate["D6"].top())  # move to the last well at the slower speed

```

Warning

These default speeds were chosen because they’re the maximum speeds that Opentrons knows will work with the gantry. Your robot may be able to move faster, but you shouldn’t increase this value unless instructed by Opentrons Support.

New in version 2\.0\.

#### Axis Speed Limits

In addition to controlling the overall gantry speed, you can set speed limits for each of the individual axes: `x` (gantry left/right motion), `y` (gantry forward/back motion), `z` (left pipette up/down motion), and `a` (right pipette up/down motion). Unlike `default_speed`, which is a pipette property, axis speed limits are stored in a protocol property [`ProtocolContext.max_speeds`](index.html#opentrons.protocol_api.ProtocolContext.max_speeds 'opentrons.protocol_api.ProtocolContext.max_speeds'); therefore the `x` and `y` values affect all movements by both pipettes. This property works like a dictionary, where the keys are axes, assigning a value to a key sets a max speed, and deleting a key or setting it to `None` resets that axis’s limit to the default:

```
    protocol.max_speeds["x"] = 50    # limit x-axis to 50 mm/s
    del protocol.max_speeds["x"]     # reset x-axis limit
    protocol.max_speeds["a"] = 10    # limit a-axis to 10 mm/s
    protocol.max_speeds["a"] = None  # reset a-axis limit

```

Note that `max_speeds` can’t set limits for the pipette plunger axes (`b` and `c`); instead, set the flow rates or plunger speeds as described in [Pipette Flow Rates](index.html#new-plunger-flow-rates).

New in version 2\.0\.

## Runtime Parameters

### Choosing Good Parameters

The first decision you need to make when adding parameters to your protocol is “What should be parameterized?” Your goals in adding parameters should be the following:

1. **Add flexibility.** Accommodate changes from run to run or from lab to lab.
2. **Work efficiently.** Don’t burden run setup with too many choices or confusing options.
3. **Avoid errors.** Ensure that every combination of parameters produces an analyzable, runnable protocol.

The trick to choosing good parameters is reasoning through the choices the protocol’s users may make. If any of them lead to nonsensical outcomes or errors, adjust the parameters — or how your protocol [uses parameter values](index.html#using-rtp) — to avoid those situations.

#### Build on a Task

Consider what scientific task is at the heart of your protocol, and build parameters that contribute to, rather than diverge from it.

For example, it makes sense to add a parameter for number of samples to a DNA prep protocol that uses a particular reagent kit. But it wouldn’t make sense to add a parameter for _which reagent kit_ to use for DNA prep. That kind of parameter would affect so many aspects of the protocol that it would make more sense to maintain a separate protocol for each kit.

Also consider how a small number of parameters can combine to produce many useful outputs. Take the serial dilution task from the [Tutorial](index.html#tutorial) as an example. We could add just three parameters to it: number of dilutions, dilution factor, and number of rows. Now that single protocol can produce a whole plate that gradually dilutes, a 2×4 grid that rapidly dilutes, and _thousands_ of other combinations.

#### Consider Contradictions

Here’s a common time\-saving use of parameters: your protocol requires a 1\-channel pipette and an 8\-channel pipette, but it doesn’t matter which mount they’re attached to. Without parameters, you would have to assign the mounts in your protocol. Then if the robot is set up in the reverse configuration, you’d have to either physically swap the pipettes or modify your protocol.

One way to get this information is to ask which mount the 1\-channel pipette is on, and which mount the 8\-channel pipette is on. But if a technician answers “left” to both questions — even by accident — the API will raise an error, because you can’t load two pipettes on a single mount. It’s no better to flip things around by asking which pipette is on the left mount, and which pipette is on the right mount. Now the technician can say that both mounts have a 1\-channel pipette. This is even more dangerous, because it _might not_ raise any errors in analysis. The protocol could run “successfully” on a robot with two 1\-channel pipettes, but produce completely unintended results.

The best way to avoid these contradictions is to collapse the two questions into one, with limited choices. Where are the pipettes mounted? Either the 1\-channel is on the left and the 8\-channel on the right, or the 8\-channel is on the left and the 1\-channel is on the right. This approach is best for several reasons:

- It avoids analysis errors.
- It avoids potentially dangerous execution errors.
- It only requires answering one question instead of two.
- The [phrasing of the question and answer](index.html#rtp-style) makes it clear that the protocol requires exactly one of each pipette type.

#### Set Boundaries

Numerical parameters support minimum and maximum values, which you should set to avoid incorrect inputs that are outside of your protocol’s possibile actions.

Consider our earlier example of parameterizing serial dilution. Each of the three numerical parameters have logical upper and lower bounds, which we need to enforce to get sensible results.

- _Number of dilutions_ must be between 0 and 11 on a 96\-well plate. And it may make sense to require at least 1 dilution.
- _Dilution factor_ is a ratio, which we can express as a decimal number that must be between 0 and 1\.
- _Number of rows_ must be between 1 and 8 on a 96\-well plate.

What if you wanted to perform a dilution with 20 repetitions? It’s possible with two 96\-well plates, or with a 384\-well plate. You could set the maximum for the number of dilutions to 24 and allow for these possibilities — either switching the plate type or loading an additional plate based on the provided value.

But what if the technician wanted to do just 8 repetitions on a 384\-well plate? That would require an additional parameter, an additional choice by the technician, and additional logic in your protocol code. It’s up to you as the protocol author to decide if adding more parameters will make protocol setup overly difficult. Sometimes it’s more efficient to work with two or three simple protocols rather than one that’s long and complex.

### Defining Parameters

To use parameters, you need to define them in [a separate function](#add-parameters) within your protocol. Each parameter definition has two main purposes: to specify acceptable values, and to inform the protocol user what the parameter does.

Depending on the [type of parameter](#rtp-types), you’ll need to specify some or all of the following.

| Attribute               | Details                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variable_name`         | _ A unique name for [referencing the parameter value](index.html#using-rtp) elsewhere in the protocol. _ Must meet the usual requirements for [naming objects in Python](https://docs.python.org/3/reference/lexical_analysis.html#identifiers). |
| `display_name`          | _ A label for the parameter shown in the Opentrons App or on the touchscreen. _ Maximum 30 characters.                                                                                                                                           |
| `description`           | _ An optional longer explanation of what the parameter does, or how its values will affect the execution of the protocol. _ Maximum 100 characters.                                                                                              |
| `default`               | \* The value the parameter will have if the technician makes no changes to it during run setup.                                                                                                                                                  |
| `minimum` and `maximum` | _ For numeric parameters only. _ Allows free entry of any value within the range (inclusive). _ Both values are required. _ Can’t be used at the same time as `choices`.                                                                         |
| `choices`               | _ For numeric or string parameters. _ Provides a fixed list of values to choose from. _ Each choice has its own display name and value. _ Can’t be used at the same time as `minimum` and `maximum`.                                             |
| `units`                 | _ Optional, for numeric parameters with `minimum` and `maximum` only. _ Displays after the number during run setup. _ Does not affect the parameter’s value or protocol execution. _ Maximum 10 characters.                                      |

#### The `add_parameters()` Function

All parameter definitions are contained in a Python function, which must be named `add_parameters` and takes a single argument. Define `add_parameters()` before the `run()` function that contains protocol commands.

The examples on this page assume the following definition, which uses the argument name `parameters`. The type specification of the argument is optional.

```
def add_parameters(parameters: protocol_api.Parameters):

```

Within this function definition, call methods on `parameters` to define parameters. The next section demonstrates how each type of parameter has its own method.

#### Types of Parameters

The API supports four types of parameters: Boolean ([`bool`](https://docs.python.org/3/library/functions.html#bool '(in Python v3.12)')), integer ([`int`](https://docs.python.org/3/library/functions.html#int '(in Python v3.12)')), floating point number ([`float`](https://docs.python.org/3/library/functions.html#float '(in Python v3.12)')), and string ([`str`](https://docs.python.org/3/library/stdtypes.html#str '(in Python v3.12)')). It is not possible to mix types within a single parameter.

##### Boolean Parameters

Boolean parameters are `True` or `False` only.

```
parameters.add_bool(
    variable_name="dry_run",
    display_name="Dry Run",
    description="Skip incubation delays and shorten mix steps.",
    default=False
)

```

During run setup, the technician can toggle between the two values. In the Opentrons App, Boolean parameters appear as a toggle switch. On the touchscreen, they appear as _On_ or _Off_, for `True` and `False` respectively.

New in version 2\.18\.

##### Integer Parameters

Integer parameters either accept a range of numbers or a list of numbers. You must specify one or the other; you can’t create an open\-ended prompt that accepts any integer.

To specify a range, include `minimum` and `maximum`.

```
parameters.add_int(
    variable_name="volume",
    display_name="Aspirate volume",
    description="How much to aspirate from each sample.",
    default=20,
    minimum=10,
    maximum=100,
    unit="µL"
)

```

During run setup, the technician can enter any integer value from the minimum up to the maximum. Entering a value outside of the range will show an error. At that point, they can correct their custom value or restore the default value.

To specify a list of numbers, include `choices`. Each choice is a dictionary with entries for display name and value. The display names let you briefly explain the effect each choice will have.

```
parameters.add_int(
    variable_name="volume",
    display_name="Aspirate volume",
    description="How much to aspirate from each sample.",
    default=20,
    choices=[
        {"display_name": "Low (10 µL)", "value": 10},
        {"display_name": "Medium (20 µL)", "value": 20},
        {"display_name": "High (50 µL)", "value": 50},
    ]
)

```

During run setup, the technician can choose from a menu of the provided choices.

New in version 2\.18\.

##### Float Parameters

Float parameters either accept a range of numbers or a list of numbers. You must specify one or the other; you can’t create an open\-ended prompt that accepts any floating point number.

Specifying a range or list is done exactly the same as in the integer examples above. The only difference is that all values must be floating point numbers.

```
parameters.add_float(
    variable_name="volume",
    display_name="Aspirate volume",
    description="How much to aspirate from each sample.",
    default=5.0,
    choices=[
        {"display_name": "Low (2.5 µL)", "value": 2.5},
        {"display_name": "Medium (5 µL)", "value": 5.0},
        {"display_name": "High (10 µL)", "value": 10.0},
    ]
)

```

New in version 2\.18\.

##### String Parameters

String parameters only accept a list of values. You can’t currently prompt for free text entry of a string value.

To specify a list of strings, include `choices`. Each choice is a dictionary with entries for display name and value. Only the display name will appear during run setup.

A common use for string display names is to provide an easy\-to\-read version of an API load name. You can also use them to briefly explain the effect each choice will have.

```
parameters.add_str(
    variable_name="pipette",
    display_name="Pipette type",
    choices=[
        {"display_name": "1-Channel 50 µL", "value": "flex_1channel_50"},
        {"display_name": "8-Channel 50 µL", "value": "flex_8channel_50"},
    ],
    default="flex_1channel_50",
)

```

During run setup, the technician can choose from a menu of the provided choices.

New in version 2\.18\.

### Using Parameters

Once you’ve [defined parameters](index.html#defining-rtp), their values are accessible anywhere within the `run()` function of your protocol.

#### The `params` Object

Protocols with parameters have a [`ProtocolContext.params`](index.html#opentrons.protocol_api.ProtocolContext.params 'opentrons.protocol_api.ProtocolContext.params') object, which contains the values of all parameters as set during run setup. Each attribute of `params` corresponds to the `variable_name` of a parameter.

For example, consider a protocol that defines the following three parameters:

- `add_bool` with `variable_name="dry_run"`
- `add_int` with `variable_name="sample_count"`
- `add_float` with `variable_name="volume"`

Then `params` will gain three attributes: `params.dry_run`, `params.sample_count`, and `params.volume`. You can use these attributes anywhere you want to access their values, including directly as arguments of methods.

```
if protocol.params.dry_run is False:
    pipette.mix(repetitions=10, volume=protocol.params.volume)

```

You can also save parameter values to variables with names of your choosing.

#### Parameter Types

Each attribute of `params` has the type corresponding to its parameter definition. Keep in mind the parameter’s type when using its value in different contexts.

Say you wanted to add a comment to the run log, stating how many samples the protocol will process. Since `sample_count` is an `int`, you’ll need to cast it to a `str` or the API will raise an error.

```
protocol.comment(
    "Processing " + str(protocol.params.sample_count) + " samples."
)

```

Also be careful with `int` types when performing calculations: dividing an `int` by an `int` with the `/` operator always produces a `float`, even if there is no remainder. The [sample count use case](index.html#use-case-sample-count) converts a sample count to a column count by dividing by 8 — but it uses the `//` integer division operator, so the result can be used for creating ranges, slicing lists, and as `int` argument values without having to cast it in those contexts.

#### Limitations

Since `params` is only available within the `run()` function, there are certain aspects of a protocol that parameter values can’t affect. These include, but are not limited to the following:

| Information                      | Location                                        |
| -------------------------------- | ----------------------------------------------- |
| `import` statements              | At the beginning of the protocol.               |
| Robot type (Flex or OT\-2\)      | In the `requirements` dictionary.               |
| API version                      | In the `requirements` or `metadata` dictionary. |
| Protocol name                    | In the `metadata` dictionary.                   |
| Protocol description             | In the `metadata` dictionary.                   |
| Protocol author                  | In the `metadata` dictionary.                   |
| Other runtime parameters         | In the `add_parameters()` function.             |
| Non\-nested function definitions | Anywhere outside of `run()`.                    |

Additionally, keep in mind that updated parameter values are applied by reanalyzing the protocol. This means you can’t depend on updated values for any action that takes place _prior to reanalysis_.

An example of such an action is applying labware offset data. Say you have a parameter that changes the type of well plate you load in a particular slot:

```
# within add_parameters()
parameters.add_str(
    variable_name="plate_type",
    display_name="Well plate type",
    choices=[
        {"display_name": "Corning", "value": "corning_96_wellplate_360ul_flat"},
        {"display_name": "NEST", "value": "nest_96_wellplate_200ul_flat"},
    ],
    default="corning_96_wellplate_360ul_flat",
)

# within run()
plate = protocol.load_labware(
    load_name=protocol.params.plate_type, location="D2"
)

```

When performing run setup, you’re prompted to apply offsets before selecting parameter values. This is your only opportunity to apply offsets, so they’re applied for the default parameter values — in this case, the Corning plate. If you then change the “Well plate type” parameter to the NEST plate, the NEST plate will have default offset values (0\.0 on all axes). You can fix this by running Labware Position Check, since it takes place after reanalysis, or by using [`Labware.set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset') in your protocol.

### Parameter Use Case – Sample Count

Choosing how many samples to process is important for efficient automation. This use case explores how a single parameter for sample count can have pervasive effects throughout a protocol. The examples are adapted from an actual parameterized protocol for DNA prep. The sample code will use 8\-channel pipettes to process 8, 16, 24, or 32 samples.

At first glance, it might seem like sample count would primarily affect liquid transfers to and from sample wells. But when using the Python API’s full range of capabilities, it affects:

- How many tip racks to load.
- The initial volume and placement of reagents.
- Pipetting to and from samples.
- If and when tip racks need to be replaced.

To keep things as simple as possible, this use case only focuses on setting up and using the value of the sample count parameter, which is just one of several parameters present in the full protocol.

#### From Samples to Columns

First of all, we need to set up the sample count parameter so it’s both easy for technicians to understand during protocol setup and easy for us to use in the protocol’s `run()` function.

We want to limit the number of samples to 8, 16, 24, or 32, so we’ll use an integer parameter with choices:

```
def add_parameters(parameters):

    parameters.add_int(
        variable_name="sample_count",
        display_name="Sample count",
        description="Number of input DNA samples.",
        default=24,
        choices=[
            {"display_name": "8", "value": 8},
            {"display_name": "16", "value": 16},
            {"display_name": "24", "value": 24},
            {"display_name": "32", "value": 32},
        ]
    )

```

All of the possible values are multiples of 8, because the protocol will use an 8\-channel pipette to process an entire column of samples at once. Considering how 8\-channel pipettes access wells, it may be more useful to operate with a _column count_ in code. We can set a `column_count` very early in the `run()` function by accessing the value of `params.sample_count` and dividing it by 8:

```
def run(protocol):

    column_count = protocol.params.sample_count // 8

```

Most examples below will use `column_count`, rather than redoing (and retyping!) this calculation multiple times.

#### Loading Tip Racks

Tip racks come first in most protocols. To ensure that the protocol runs to completion, we need to load enough tip racks to avoid running out of tips.

We could load as many tip racks as are needed for our maximum number of samples, but that would be suboptimal. Run setup is faster when the technician doesn’t have to load extra items onto the deck. So it’s best to examine the protocol’s steps and determine how many racks are needed for each value of `sample_count`.

In the case of this DNA prep protocol, we can create formulas for the number of 200 µL and 50 µL tip racks needed. The following factors go into these computations:

- 50 µL tips
  - 1 fixed action that picks up once per protocol.
  - 7 variable actions that pick up once per sample column.
- 200 µL tips
  - 2 fixed actions that pick up once per protocol.
  - 11 variable actions that pick up once per sample column.

Since each tip rack has 12 columns, divide the number of pickup actions by 12 to get the number of racks needed. And we always need to round up — performing 13 pickups requires 2 racks. The [`math.ceil()`](https://docs.python.org/3/library/math.html#math.ceil '(in Python v3.12)') method rounds up to the nearest integer. We’ll add `from math import ceil` at the top of the protocol and then calculate the number of tip racks as follows:

```
tip_rack_50_count = ceil((1 + 7 * column_count) / 12)
tip_rack_200_count = ceil((2 + 13 * column_count) / 12)

```

Running the numbers shows that the maximum combined number of tip racks is 7\. Now we have to decide where to load up to 7 racks, working around the modules and other labware on the deck. Assuming we’re running this protocol on a Flex with staging area slots, they’ll all fit! (If you don’t have staging area slots, you can load labware off\-deck instead.) We’ll reserve these slots for the different size racks:

```
tip_rack_50_slots = ["B3", "C3", "B4"]
tip_rack_200_slots = ["A2", "B2", "A3", "A4"]

```

Finally, we can combine this information to call [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware'). Depending on the number of racks needed, we’ll slice that number of elements from the slot list and use a [list comprehension](https://docs.python.org/2/tutorial/datastructures.html#list-comprehensions) to gather up the loaded tip racks. For the 50 µL tips, this would look like:

```
tip_racks_50 = [
    protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_50ul",
        location=slot
    )
    for slot in tip_rack_50_slots[:tip_rack_50_count]
]

```

Then we can associate those lists of tip racks directly with each pipette as we load them. All together, the start of our `run()` function looks like this:

```
# calculate column count from sample count
column_count = protocol.params.sample_count // 8

# calculate number of required tip racks
tip_rack_50_count = ceil((1 + 7 * column_count) / 12)
tip_rack_200_count = ceil((2 + 13 * column_count) / 12)

# assign tip rack locations (maximal case)
tip_rack_50_slots = ["B3", "C3", "B4"]
tip_rack_200_slots = ["A2", "B2", "A3", "A4"]

# create lists of loaded tip racks
# limit to number of needed racks for each type
tip_racks_50 = [
    protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_50ul",
        location=slot
    )
    for slot in tip_rack_50_slots[:tip_rack_50_count]
]
tip_racks_200 = [
    protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location=slot
    )
    for slot in tip_rack_200_slots[:tip_rack_200_count]
]

pipette_50 = protocol.load_instrument(
    instrument_name="flex_8channel_50",
    mount="right",
    tip_racks=tip_racks_50
)
pipette_1000 = protocol.load_instrument(
    instrument_name="flex_1channel_1000",
    mount="left",
    tip_racks=tip_racks_200
)

```

This code will load as few as 3 tip racks and as many as 7, and associate them with the correct pipettes — all based on a single choice from a dropdown menu at run setup.

#### Loading Liquids

Next come the reagents, samples, and the labware that holds them.

The required volume of each reagent is dependent on the sample count. While the full protocol defines more than ten liquids, we’ll show three reagents plus the samples here.

First, let’s load a reservoir and [define](index.html#defining-liquids) the three example liquids. Definitions only specify the name, description, and display color, so our sample count parameter doesn’t come into play yet:

```
# labware to hold reagents
reservoir = protocol.load_labware(
    load_name="nest_12_reservoir_15ml", location="C2"
)

# reagent liquid definitions
ampure_liquid = protocol.define_liquid(
    name="AMPure", description="AMPure Beads", display_color="#704848"
)
tagstop_liquid = protocol.define_liquid(
    name="TAGSTOP", description="Tagmentation Stop", display_color="#FF0000"
)
twb_liquid = protocol.define_liquid(
    name="TWB", description="Tagmentation Wash Buffer", display_color="#FFA000"
)

```

Now we’ll bring sample count into consideration as we [load the liquids](index.html#loading-liquids). The application requires the following volumes for each column of samples:

| Liquid                   | Volume (µL per column) |
| ------------------------ | ---------------------- |
| AMPure Beads             | 180                    |
| Tagmentation Stop        | 10                     |
| Tagmentation Wash Buffer | 900                    |

To calculate the total volume for each liquid, we’ll multiply these numbers by `column_count` and by 1\.1 (to ensure that the pipette can aspirate the required volume without drawing in air at the bottom of the well). This calculation can be done inline as the `volume` value of [`load_liquid()`](index.html#opentrons.protocol_api.Well.load_liquid 'opentrons.protocol_api.Well.load_liquid'):

```
reservoir["A1"].load_liquid(
    liquid=ampure_liquid, volume=180 * column_count * 1.1
)
reservoir["A2"].load_liquid(
    liquid=tagstop_liquid, volume=10 * column_count * 1.1
)
reservoir["A4"].load_liquid(
    liquid=twb_liquid, volume=900 * column_count * 1.1
)

```

Now, for example, the volume of AMPure beads to load will vary from 198 µL for a single sample column up to 792 µL for four columns.

Tip

Does telling a technician to load 792 µL of a liquid seem overly precise? Remember that you can perform any calculation you like to set the value of `volume`! For example, you could round the AMPure volume up to the nearest 10 µL:

```
volume=ceil((180 * column_count * 1.1) / 10) * 10

```

Finally, it’s good practice to label the wells where the samples reside. The sample plate starts out atop the Heater\-Shaker Module:

```
hs_mod = protocol.load_module(
    module_name="heaterShakerModuleV1", location="D1"
)
hs_adapter = hs_mod.load_adapter(name="opentrons_96_pcr_adapter")
sample_plate = hs_adapter.load_labware(
    name="opentrons_96_wellplate_200ul_pcr_full_skirt",
    label="Sample Plate",
)

```

Now we can construct a `for` loop to label each sample well with `load_liquid()`. The simplest way to do this is to combine our original _sample count_ with the fact that the [`Labware.wells()`](index.html#opentrons.protocol_api.Labware.wells 'opentrons.protocol_api.Labware.wells') accessor returns wells top\-to\-bottom, left\-to\-right:

```
# define sample liquid
sample_liquid = protocol.define_liquid(
    name="Samples", description=None, display_color="#52AAFF"
)

# load 40 µL in each sample well
for w in range(protocol.params.sample_count):
    sample_plate.wells()[w].load_liquid(liquid=sample_liquid, volume=40)

```

#### Processing Samples

When it comes time to process the samples, we’ll return to working by column, since the protocol uses an 8\-channel pipette. There are many pipetting stages in the full protocol, but this section will examine just the stage for adding the Tagmentation Stop liquid. The same techniques would apply to similar stages.

For pipetting in the original sample locations, we’ll command the 50 µL pipette to move to some or all of A1–A4 on the sample plate. Similar to when we loaded tip racks earlier, we can use `column_count` to slice a list containing these well names, and then iterate over that list with a `for` loop:

```
for w in ["A1", "A2", "A3", "A4"][:column_count]:
    pipette_50.pick_up_tip()
    pipette_50.aspirate(volume=13, location=reservoir["A2"].bottom())
    pipette_50.dispense(volume=3, location=reservoir["A2"].bottom())
    pipette_50.dispense(volume=10, location=sample_plate[w].bottom())
    pipette_50.move_to(location=sample_plate[w].bottom())
    pipette_50.mix(repetitions=10, volume=20)
    pipette_50.blow_out(location=sample_plate[w].top(z=-2))
    pipette_50.drop_tip()

```

Each time through the loop, the pipette will fill from the same well of the reservoir and then dispense (and mix and blow out) in a different column of the sample plate.

Later steps of the protocol will move intermediate samples to the middle of the plate (columns 5–8\) and final samples to the right side of the plate (columns 9–12\). When moving directly from one set of columns to another, we have to track _both lists_ with the `for` loop. The [`zip()`](https://docs.python.org/3/library/functions.html#zip '(in Python v3.12)') function lets us pair up the lists of well names and step through them in parallel:

```
for initial, intermediate in zip(
    ["A1", "A2", "A3", "A4"][:column_count],
    ["A5", "A6", "A7", "A8"][:column_count],
):
    pipette_50.pick_up_tip()
    pipette_50.aspirate(volume=13, location=sample_plate[initial])
    pipette_50.dispense(volume=13, location=sample_plate[intermediate])
    pipette_50.drop_tip()

```

This will transfer from column 1 to 5, 2 to 6, and so on — depending on the number of samples chosen during run setup.

#### Replenishing Tips

For the higher values of `protocol.params.sample_count`, the protocol will load tip racks in the staging area slots (column 4\). Since pipettes can’t reach these slots, we need to move these tip racks into the working area (columns 1–3\) before issuing a pipetting command that targets them, or the API will raise an error.

A protocol without parameters will always run out of tips at the same time — just add a [`move_labware()`](index.html#opentrons.protocol_api.ProtocolContext.move_labware 'opentrons.protocol_api.ProtocolContext.move_labware') command when that happens. But as we saw in the Processing Samples section above, our parameterized protocol will go through tips at a different rate depending on the sample count.

In our simplified example, we know that when the sample count is 32, the first 200 µL tip rack will be exhausted after three stages of pipetting using the 1000 µL pipette. So, after that step, we could add:

```
if protocol.params.sample_count == 32:
    protocol.move_labware(
        labware=tip_racks_200[0],
        new_location=chute,
        use_gripper=True,
    )
    protocol.move_labware(
        labware=tip_racks_200[-1],
        new_location="A2",
        use_gripper=True,
    )

```

This will replace the first 200 µL tip rack (in slot A2\) with the last 200 µL tip rack (in the staging area).

However, in the full protocol, sample count is not the only parameter that affects the rate of tip use. It would be unwieldy to calculate in advance all the permutations of when tip replenishment is necessary. Instead, before each stage of the protocol, we could use [`Well.has_tip()`](index.html#opentrons.protocol_api.Well.has_tip 'opentrons.protocol_api.Well.has_tip') to check whether the first tip rack is empty. If the _last well_ of the rack is empty, we can assume that the entire rack is empty and needs to be replaced:

```
if tip_racks_200[0].wells()[-1].has_tip is False:
    # same move_labware() steps as above

```

For a protocol that uses tips at a faster rate than this one — such that it might exhaust a tip rack in a single `for` loop of pipetting steps — you may have to perform such checks even more frequently. You can even define a function that counts tips or performs `has_tip` checks in combination with picking up a tip, and use that instead of [`pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip') every time you pipette. The built\-in capabilities of Python and the methods of the Python Protocol API give you the flexibility to add this kind of smart behavior to your protocols.

### Parameter Use Case – Dry Run

When testing out a new protocol, it’s common to perform a dry run to watch your robot go through all the steps without actually handling samples or reagents. This use case explores how to add a single Boolean parameter for whether you’re performing a dry run.

The code examples will show how this single value can control:

- Skipping module actions and long delays.
- Reducing mix repetitions to save time.
- Returning tips (that never touched any liquid) to their racks.

To keep things as simple as possible, this use case only focuses on setting up and using the value of the dry run parameter, which could be just one of many parameters in a complete protocol.

#### Dry Run Definition

First, we need to set up the dry run parameter. We want to set up a simple yes/no choice for the technician running the protocol, so we’ll use a Boolean parameter:

```
def add_parameters(parameters):

    parameters.add_bool(
        variable_name="dry_run",
        display_name="Dry Run",
        description=(
            "Skip delays,"
            " shorten mix steps,"
            " and return tips to their racks."
        ),
        default=False
    )

```

This parameter is set to `False` by default, assuming that most runs will be live runs. In other words, during run setup the technician will have to change the parameter setting to perform a dry run. If they leave it as is, the robot will perform a live run.

Additionally, since “dry run” can have different meanings in different contexts, it’s important to include a `description` that indicates exactly what the parameter will control — in this case, three things. The following sections will show how to accomplish each of those when the dry run parameter is set to `True`.

#### Skipping Delays

Many protocols have built\-in delays, either for a module to work or to let a reaction happen passively. Lengthy delays just get in the way when verifying a protocol with a dry run. So wherever the protocol calls for a delay, we can check the value of `protocol.params.dry_run` and make the protocol behave accordingly.

To start, let’s consider a simple [`delay()`](index.html#opentrons.protocol_api.ProtocolContext.delay 'opentrons.protocol_api.ProtocolContext.delay') command. We can wrap it in an `if` statement such that the delay will only execute when the run is _not_ a dry run:

```
if protocol.params.dry_run is False:
    protocol.delay(minutes=5)

```

You can extend this approach to more complex situations, like module interactions. For example, in a protocol that moves a plate to the Thermocycler for an incubation, you’ll want to perform all the movement steps — opening and closing the module lid, and moving the plate to and from the block — but skip the heating and cooling time. The simplest way to do this is, like in the delay example above, to wrap each skippable command:

```
protocol.move_labware(labware=plate, new_location=tc_mod, use_gripper=True)
if protocol.params.dry_run is False:
    tc_mod.set_block_temperature(4)
    tc_mod.set_lid_temperature(100)
tc_mod.close_lid()
pcr_profile = [
    {"temperature": 68, "hold_time_seconds": 180},
    {"temperature": 98, "hold_time_seconds": 180},
]
if protocol.params.dry_run is False:
    tc_mod.execute_profile(
        steps=pcr_profile, repetitions=1, block_max_volume=50
    )
tc_mod.open_lid()

```

#### Shortening Mix Steps

Similar to delays, mix steps can take a long time because they are inherently repetitive actions. Mixing ten times takes ten times as long as mixing once! To save time, set a mix repetitions variable based on the value of `protocol.params.dry_run` and pass that to [`mix()`](index.html#opentrons.protocol_api.InstrumentContext.mix 'opentrons.protocol_api.InstrumentContext.mix'):

```
if protocol.params.dry_run is True:
    mix_reps = 1
else:
    mix_reps = 10
pipette.mix(repetitions=mix_reps, volume=50, location=plate["A1"].bottom())

```

Note that this checks whether the dry run parameter is `True`. If you prefer to set up all your `if` statements to check whether it’s `False`, you can reverse the logic:

```
if protocol.params.dry_run is False:
    mix_reps = 10
else:
    mix_reps = 1

```

#### Returning Tips

Tips used in a dry run should be reusable — for another dry run, if nothing else. It doesn’t make sense to dispose of them in a trash container, unless you specifically need to test movement to the trash. You can choose whether to use [`drop_tip()`](index.html#opentrons.protocol_api.InstrumentContext.drop_tip 'opentrons.protocol_api.InstrumentContext.drop_tip') or [`return_tip()`](index.html#opentrons.protocol_api.InstrumentContext.return_tip 'opentrons.protocol_api.InstrumentContext.return_tip') based on the value of `protocol.params.dry_run`. If the protocol doesn’t have too many tip drop actions, you can use an `if` statement each time:

```
if protocol.params.dry_run is True:
    pipette.return_tip()
else:
    pipette.drop_tip()

```

However, repeating this block every time you handle tips could significantly clutter your code. Instead, you could define it as a function:

```
def return_or_drop(pipette):
    if protocol.params.dry_run is True:
        pipette.return_tip()
    else:
        pipette.drop_tip()

```

Then call that function throughout your protocol:

```
pipette.pick_up_tip()
return_or_drop(pipette)

```

Note

It’s generally better to define a standalone function, rather than adding a method to the [`InstrumentContext`](index.html#opentrons.protocol_api.InstrumentContext 'opentrons.protocol_api.InstrumentContext') class. This makes your custom, parameterized commands stand out from API methods in your code.

Additionally, if your protocol uses enough tips that you have to replenish tip racks, you’ll need separate behavior for dry runs and live runs. In a live run, once you’ve used all the tips, the rack is empty, because the tips are in the trash. In a dry run, once you’ve used all the tips in a rack, the rack is _full_, because you returned the tips.

The API has methods to handle both of these situations. To continue using the same tip rack without physically replacing it, call [`reset_tipracks()`](index.html#opentrons.protocol_api.InstrumentContext.reset_tipracks 'opentrons.protocol_api.InstrumentContext.reset_tipracks'). In the live run, move the empty tip rack off the deck and move a full one into place:

```
if protocol.params.dry_run is True:
    pipette.reset_tipracks()
else:
    protocol.move_labware(
        labware=tips_1, new_location=chute, use_gripper=True
    )
    protocol.move_labware(
        labware=tips_2, new_location="C3", use_gripper=True
    )

```

You can modify this code for similar cases. You may be moving tip racks by hand, rather than with the gripper. Or you could even mix the two, moving the used (but full) rack off\-deck by hand — instead of dropping it down the chute, spilling all the tips — and have the gripper move a new rack into place. Ultimately, it’s up to you to fine\-tune your dry run behavior, and communicate it to your protocol’s users with your parameter descriptions.

### Parameter Style Guide

It’s important to write clear names and descriptions when you [define parameters](index.html#defining-rtp) in your protocols. Clarity improves the user experience for the technicians who run your protocols. They rely on your parameter names and descriptions to understand how the robot will function when running your protocol.

Adopting the advice of this guide will help make your protocols clear, consistent, and ultimately easy to use. It also aligns them with protocols in the [Opentrons Protocol Library](https://library.opentrons.com), which can help others access and replicate your science.

#### General Guidance

**Parameter names are nouns.** Parameters should be discrete enough that you can describe them in a single word or short noun phrase. `display_name` is limited to 30 characters, and you can add more context in the description.

Don’t ask questions or put other sentence punctuation in parameter names. For example:

| ✅ Dry run           | ❌ Dry run?                      |
| -------------------- | -------------------------------- |
| ✅ Sample count      | ❌ How many samples?             |
| ✅ Number of samples | ❌ Number of samples to process. |

**Parameter descriptions explain actions.** In one or two clauses or sentences, state when and how the parameter value is used in the protocol. Don’t merely restate the parameter name.

Punctuate descriptions as sentences, even if they aren’t complete sentences. For example:

| Parameter name  | Parameter description                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Dry run         | _ ✅ Skip incubation delays and shorten mix steps. _ ❌ Whether to do a dry run.                                                              |
| Aspirate volume | _ ✅ How much to aspirate from each sample. _ ❌ Volume that the pipette will aspirate                                                        |
| Dilution factor | _ ✅ Each step uses this ratio of total liquid to original solution. Express the ratio as a decimal. _ ❌ total/diluent ratio for the process |

Not every parameter requires a description! For example, in a protocol that uses only one pipette, it would be difficult to explain a parameter named “Pipette type” without repeating yourself. In a protocol that offers parameters for two different pipettes, it may be useful to summarize what steps each pipette performs.

**Use sentence case for readability**. Sentence case means adding a capital letter to _only_ the first word of the name and description. This gives your parameters a professional appearance. Keep proper names capitalized as they would be elsewhere in a sentence. For example:

| ✅ Number of samples       | ❌ number of samples       |
| -------------------------- | -------------------------- |
| ✅ Temperature Module slot | ❌ Temperature module slot |
| ✅ Dilution factor         | ❌ Dilution Factor         |

**Use numerals for all numbers.** In a scientific context, this includes single\-digit numbers. Additionally, punctuate numbers according to the needs of your protocol’s users. If you plan to share your protocol widely, consider using American English number punctuation (comma for thousands separator; period for decimal separator).

**Order choices logically.** Place items within the `choices` attribute in the order that makes sense for your application.

Numeric choices should either ascend or descend. Consider an offset parameter with choices. Sorting according to value is easy to use in either direction, but sorting by absolute value is difficult:

| ✅ \-3, \-2, \-1, 0, 1, 2, 3 | ❌ 0, 1, \-1, 2, \-2, 3, \-3 |
| ---------------------------- | ---------------------------- |
| ✅ 3, 2, 1, 0, \-1, \-2, \-3 |                              |

String choices may have an intrinsic ordering. If they don’t, fall back to alphabetical order.

| Parameter name | Parameter description                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| Liquid color   | _ ✅ Red, Orange, Yellow, Green, Blue, Violet _ ❌ Blue, Green, Orange, Red, Violet, Yellow |
| Tube brand     | _ ✅ Eppendorf, Falcon, Generic, NEST _ ❌ Falcon, NEST, Eppendorf, Generic                 |

#### Type\-Specific Guidance

##### Booleans

The `True` value of a Boolean corresponds to the word _On_ and the `False` value corresponds to the word _Off_.

**Avoid double negatives.** These are difficult to understand and may lead to a technician making an incorrect choice. Remember that negation can be part of a word’s meaning! For example, it’s difficult to reason about what will happen when a parameter named “Deactivate module” is set to “Off”.

**When in doubt, clarify in the description.** If you feel like you need to add extra clarity to your Boolean choices, use the phrase “When on” or “When off” at the beginning of your description. For example, a parameter named “Dry run” could have the description “When on, skip protocol delays and return tips instead of trashing them.”

##### Number Choices

**Don’t repeat text in choices.** Rely on the name and description to indicate what the number refers to. It’s OK to add units to the display names of numeric choices, because the `unit` attribute is ignored when you specify `choices`.

| Parameter name    | Parameter description                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Number of columns | _ ✅ 1, 2, 3 _ ❌ 1 column, 2 columns, 3 columns                                                                     |
| Aspirate volume   | _ ✅ 10 µL, 20 µL, 50 µL _ ✅ Low (10 µL), Medium (20 µL), High (50 µL) \* ❌ Low volume, Medium volume, High volume |

**Use a range instead of choices when all values are acceptable.** It’s faster and easier to enter a numeric value than to choose from a long list. For example, a “Number of columns” parameter that accepts any number 1 through 12 should specify a `minimum` and `maximum`, rather than `choices`. However, if the application requires that the parameter only accepts even numbers, you need to specify choices (2, 4, 6, 8, 10, 12\).

##### Strings

**Avoid strings that are synonymous with “yes” and “no”.** When presenting exactly two string choices, consider their meaning. Can they be rephrased in terms of “yes/no”, “true/false”, or “on/off”? If no, then a string parameter is appropriate. If yes, it’s better to use a Boolean, which appears in run setup as a toggle rather than a dropdown menu.

> - ✅ Blue, Red
> - ✅ Left\-to\-right, Right\-to\-left
> - ❌ Include, Exclude
> - ❌ Yes, No

Runtime parameters let you define user\-customizable variables in your Python protocols. This gives you greater flexibility and puts extra control in the hands of the technician running the protocol — without forcing them to switch between lots of protocol files or write code themselves.

This section begins with the fundamentals of runtime parameters:

- Preliminary advice on how to [choose good parameters](index.html#good-rtps), before you start writing code.
- The syntax for [defining parameters](index.html#defining-rtp) with boolean, numeric, and string values.
- How to [use parameter values](index.html#using-rtp) in your protocol, building logic and API calls that implement the technician’s choices.

It continues with a selection of use cases and some overall style guidance. When adding parameters, you are in charge of the user experience when it comes time to set up the protocol! These pages outline best practices for making your protocols reliable and easy to use.

- [Use case – sample count](index.html#use-case-sample-count): Change behavior throughout a protocol based on how many samples you plan to process. Setting sample count exactly saves time, tips, and reagents.
- [Use case – dry run](index.html#use-case-dry-run): Test your protocol, rather than perform a live run, just by flipping a toggle.
- [Style and usage](index.html#rtp-style): When you’re a protocol author, you write code. When you’re a parameter author, you write words. Follow this advice to make things as clear as possible for the technicians who will run your protocol.

## Advanced Control

As its name implies, the Python Protocol API is primarily designed for creating protocols that you upload via the Opentrons App and execute on the robot as a unit. But sometimes it’s more convenient to control the robot outside of the app. For example, you might want to have variables in your code that change based on user input or the contents of a CSV file. Or you might want to only execute part of your protocol at a time, especially when developing or debugging a new protocol.

The Python API offers two ways of issuing commands to the robot outside of the app: through Jupyter Notebook or on the command line with `opentrons_execute`.

### Jupyter Notebook

The Flex and OT\-2 run [Jupyter Notebook](https://jupyter.org) servers on port 48888, which you can connect to with your web browser. This is a convenient environment for writing and debugging protocols, since you can define different parts of your protocol in different notebook cells and run a single cell at a time.

Access your robot’s Jupyter Notebook by either:

- Going to the **Advanced** tab of Robot Settings and clicking **Launch Jupyter Notebook**.
- Going directly to `http://<robot-ip>:48888` in your web browser (if you know your robot’s IP address).

Once you’ve launched Jupyter Notebook, you can create a notebook file or edit an existing one. These notebook files are stored on the the robot. If you want to save code from a notebook to your computer, go to **File \> Download As** in the notebook interface.

#### Protocol Structure

Jupyter Notebook is structured around cells: discrete chunks of code that can be run individually. This is nearly the opposite of Opentrons protocols, which bundle all commands into a single `run` function. Therefore, to take full advantage of Jupyter Notebook, you have to restructure your protocol.

Rather than writing a `run` function and embedding commands within it, start your notebook by importing `opentrons.execute` and calling [`opentrons.execute.get_protocol_api()`](index.html#opentrons.execute.get_protocol_api 'opentrons.execute.get_protocol_api'). This function also replaces the `metadata` block of a standalone protocol by taking the minimum [API version](index.html#v2-versioning) as its argument. Then you can call [`ProtocolContext`](index.html#opentrons.protocol_api.ProtocolContext 'opentrons.protocol_api.ProtocolContext') methods in subsequent lines or cells:

```
import opentrons.execute
protocol = opentrons.execute.get_protocol_api("2.19")
protocol.home()

```

The first command you execute should always be [`home()`](index.html#opentrons.protocol_api.ProtocolContext.home 'opentrons.protocol_api.ProtocolContext.home'). If you try to execute other commands first, you will get a `MustHomeError`. (When running protocols through the Opentrons App, the robot homes automatically.)

You should use the same [`ProtocolContext`](index.html#opentrons.protocol_api.ProtocolContext 'opentrons.protocol_api.ProtocolContext') throughout your notebook, unless you need to start over from the beginning of your protocol logic. In that case, call [`get_protocol_api()`](index.html#opentrons.execute.get_protocol_api 'opentrons.execute.get_protocol_api') again to get a new [`ProtocolContext`](index.html#opentrons.protocol_api.ProtocolContext 'opentrons.protocol_api.ProtocolContext').

#### Running a Previously Written Protocol

You can also use Jupyter to run a protocol that you have already written. To do so, first copy the entire text of the protocol into a cell and run that cell:

```
import opentrons.execute
from opentrons import protocol_api
def run(protocol: protocol_api.ProtocolContext):
    # the contents of your previously written protocol go here

```

Since a typical protocol only defines the `run` function but doesn’t call it, this won’t immediately cause the robot to move. To begin the run, instantiate a [`ProtocolContext`](index.html#opentrons.protocol_api.ProtocolContext 'opentrons.protocol_api.ProtocolContext') and pass it to the `run` function you just defined:

```
protocol = opentrons.execute.get_protocol_api("2.19")
run(protocol)  # your protocol will now run

```

### Setting Labware Offsets

All positions relative to labware are adjusted automatically based on labware offset data. When you’re running your code in Jupyter Notebook or with `opentrons_execute`, you need to set your own offsets because you can’t perform run setup and Labware Position Check in the Opentrons App or on the Flex touchscreen.

#### Creating a Dummy Protocol

For advanced control applications, do the following to calculate and apply labware offsets:

> 1. Create a “dummy” protocol that loads your labware and has each used pipette pick up a tip from a tip rack.
> 2. Import the dummy protocol to the Opentrons App.
> 3. Run Labware Position Check from the app or touchscreen.
> 4. Add the offsets to your code with [`set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset').

Creating the dummy protocol requires you to:

> 1. Use the `metadata` or `requirements` dictionary to specify the API version. (See [Versioning](index.html#v2-versioning) for details.) Use the same API version as you did in [`opentrons.execute.get_protocol_api()`](index.html#opentrons.execute.get_protocol_api 'opentrons.execute.get_protocol_api').
> 2. Define a `run()` function.
> 3. Load all of your labware in their initial locations.
> 4. Load your smallest capacity pipette and specify its `tip_racks`.
> 5. Call `pick_up_tip()`. Labware Position Check can’t run if you don’t pick up a tip.

For example, the following dummy protocol will use a P300 Single\-Channel GEN2 pipette to enable Labware Position Check for an OT\-2 tip rack, NEST reservoir, and NEST flat well plate.

```
metadata = {"apiLevel": "2.13"}

 def run(protocol):
     tiprack = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
     reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
     plate = protocol.load_labware("nest_96_wellplate_200ul_flat", 3)
     p300 = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tiprack])
     p300.pick_up_tip()
     p300.return_tip()

```

After importing this protocol to the Opentrons App, run Labware Position Check to get the x, y, and z offsets for the tip rack and labware. When complete, you can click **Get Labware Offset Data** to view automatically generated code that uses [`set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset') to apply the offsets to each piece of labware.

```
labware_1 = protocol.load_labware("opentrons_96_tiprack_300ul", location="1")
labware_1.set_offset(x=0.00, y=0.00, z=0.00)

labware_2 = protocol.load_labware("nest_12_reservoir_15ml", location="2")
labware_2.set_offset(x=0.10, y=0.20, z=0.30)

labware_3 = protocol.load_labware("nest_96_wellplate_200ul_flat", location="3")
labware_3.set_offset(x=0.10, y=0.20, z=0.30)

```

This automatically generated code uses generic names for the loaded labware. If you want to match the labware names already in your protocol, change the labware names to match your original code:

```
reservoir = protocol.load_labware("nest_12_reservoir_15ml", "2")
reservoir.set_offset(x=0.10, y=0.20, z=0.30)

```

New in version 2\.12\.

Once you’ve executed this code in Jupyter Notebook, all subsequent positional calculations for this reservoir in slot 2 will be adjusted 0\.1 mm to the right, 0\.2 mm to the back, and 0\.3 mm up.

Keep in mind that `set_offset()` commands will override any labware offsets set by running Labware Position Check in the Opentrons App. And you should follow the behavior of Labware Position Check, i.e., _do not_ reuse offset measurements unless they apply to the _same labware type_ in the _same deck slot_ on the _same robot_.

Warning

Improperly reusing offset data may cause your robot to move to an unexpected position or crash against labware, which can lead to incorrect protocol execution or damage your equipment. When in doubt: run Labware Position Check again and update your code!

#### Labware Offset Behavior

How the API applies labware offsets varies depending on the API level of your protocol. This section describes the latest behavior. For details on how offsets work in earlier API versions, see the API reference entry for [`set_offset()`](index.html#opentrons.protocol_api.Labware.set_offset 'opentrons.protocol_api.Labware.set_offset').

In the latest API version, offsets apply to labware type–location combinations. For example, if you use `set_offset()` on a tip rack, use all the tips, and replace the rack with a fresh one of the same type in the same location, the offsets will apply to the fresh tip rack:

```
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

```

Because offsets apply to combinations of labware type and location, if you want an offset to apply to a piece of labware as it moves around the deck, call `set_offset()` again after each movement:

```
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

```

### Using Custom Labware

If you have custom labware definitions you want to use with Jupyter, make a new directory called `labware` in Jupyter and put the definitions there. These definitions will be available when you call [`load_labware()`](index.html#opentrons.protocol_api.ProtocolContext.load_labware 'opentrons.protocol_api.ProtocolContext.load_labware').

### Using Modules

If your protocol uses [modules](index.html#new-modules), you need to take additional steps to make sure that Jupyter Notebook doesn’t send commands that conflict with the robot server. Sending commands to modules while the robot server is running will likely cause errors, and the module commands may not execute as expected.

To disable the robot server, open a Jupyter terminal session by going to **New \> Terminal** and run `systemctl stop opentrons-robot-server`. Then you can run code from cells in your notebook as usual. When you are done using Jupyter Notebook, you should restart the robot server with `systemctl start opentrons-robot-server`.

Note

While the robot server is stopped, the robot will display as unavailable in the Opentrons App. If you need to control the robot or its attached modules through the app, you need to restart the robot server and wait for the robot to appear as available in the app.

### Command Line

The robot’s command line is accessible either by going to **New \> Terminal** in Jupyter or [via SSH](https://support.opentrons.com/s/article/Connecting-to-your-OT-2-with-SSH).

To execute a protocol from the robot’s command line, copy the protocol file to the robot with `scp` and then run the protocol with `opentrons_execute`:

```
opentrons_execute /data/my_protocol.py

```

By default, `opentrons_execute` will print out the same run log shown in the Opentrons App, as the protocol executes. It also prints out internal logs at the level `warning` or above. Both of these behaviors can be changed. Run `opentrons_execute --help` for more information.

## Protocol Examples

This page provides simple, ready\-made protocols for Flex and OT\-2\. Feel free to copy and modify these examples to create unique protocols that help automate your laboratory workflows. Also, experimenting with these protocols is another way to build upon the skills you’ve learned from working through the [tutorial](index.html#tutorial). Try adding different hardware, labware, and commands to a sample protocol and test its validity after importing it into the Opentrons App.

### Using These Protocols

These sample protocols are designed for anyone using an Opentrons Flex or OT\-2 liquid handling robot. For our users with little to no Python experience, we’ve taken some liberties with the syntax and structure of the code to make it easier to understand. For example, we’ve formatted the samples with line breaks to show method arguments clearly and to avoid horizontal scrolling. Additionally, the methods use [named arguments](https://en.wikipedia.org/wiki/Named_parameter) instead of positional arguments. For example:

```
# This code uses named arguments
tiprack_1 = protocol.load_labware(
    load_name="opentrons_flex_96_tiprack_200ul",
    location="D2")

# This code uses positional arguments
tiprack_1 = protocol.load_labware("opentrons_flex_96_tiprack_200ul", "D2")

```

Both examples instantiate the variable `tiprack_1` with a Flex tip rack, but the former is more explicit. It shows the parameter name and its value together (e.g. `location="D2"`), which may be helpful when you’re unsure about what’s going on in a protocol code sample.

Python developers with more experience should feel free to ignore the code styling used here and work with these examples as you like.

### Instruments and Labware

The sample protocols all use the following pipettes:

- Flex 1\-Channel Pipette (5–1000 µL). The API load name for this pipette is `flex_1channel_1000`.
- P300 Single\-Channel GEN2 pipette for the OT\-2\. The API load name for this pipette is `p300_single_gen2`.

They also use the labware listed below:

| Labware type   | Labware name                            | API load name                     |
| -------------- | --------------------------------------- | --------------------------------- |
| Reservoir      | USA Scientific 12\-Well Reservoir 22 mL | `usascientific_12_reservoir_22ml` |
| Well plate     | Corning 96\-Well Plate 360 µL Flat      | `corning_96_wellplate_360ul_flat` |
| Flex tip rack  | Opentrons Flex 96 Tip Rack 200 µL       | `opentrons_flex_96_tiprack_200ul` |
| OT\-2 tip rack | Opentrons 96 Tip Rack 300 µL            | `opentrons_96_tiprack_300ul`      |

### Protocol Template

This code only loads the instruments and labware listed above, and performs no other actions. Many code snippets from elsewhere in the documentation will run without modification when added at the bottom of this template. You can also use it to start writing and testing your own code.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # load tip rack in deck slot D3
    tiprack = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul", location="D3"
    )
    # attach pipette to left mount
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack]
    )
    # load well plate in deck slot D2
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat", location="D2"
    )
    # load reservoir in deck slot D1
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml", location="D1"
    )
    # load trash bin in deck slot A3
    trash = protocol.load_trash_bin(location="A3")
    # Put protocol commands here

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    # load tip rack in deck slot 3
    tiprack = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul", location=3
    )
    # attach pipette to left mount
    pipette = protocol.load_instrument(
        instrument_name="p300_single_gen2",
        mount="left",
        tip_racks=[tiprack]
    )
    # load well plate in deck slot 2
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat", location=2
    )
    # load reservoir in deck slot 1
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml", location=1
    )
    # Put protocol commands here

```

### Transferring Liquids

These protocols demonstrate how to move 100 µL of liquid from one well to another.

#### Basic Method

This protocol uses some [building block commands](index.html#v2-atomic-commands) to tell the robot, explicitly, where to go to aspirate and dispense liquid. These commands include the [`pick_up_tip()`](index.html#opentrons.protocol_api.InstrumentContext.pick_up_tip 'opentrons.protocol_api.InstrumentContext.pick_up_tip'), [`aspirate()`](index.html#opentrons.protocol_api.InstrumentContext.aspirate 'opentrons.protocol_api.InstrumentContext.aspirate'), and [`dispense()`](index.html#opentrons.protocol_api.InstrumentContext.dispense 'opentrons.protocol_api.InstrumentContext.dispense') methods.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel":"2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D2")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
    tip_racks=[tiprack_1])

    pipette.pick_up_tip()
    pipette.aspirate(100, plate["A1"])
    pipette.dispense(100, plate["B1"])
    pipette.drop_tip()

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
            load_name="opentrons_96_tiprack_300ul",
            location=2)
    p300 = protocol.load_instrument(
            instrument_name="p300_single",
            mount="left",
            tip_racks=[tiprack_1])

    p300.pick_up_tip()
    p300.aspirate(100, plate["A1"])
    p300.dispense(100, plate["B1"])
    p300.drop_tip()

```

#### Advanced Method

This protocol accomplishes the same thing as the previous example, but does it a little more efficiently. Notice how it uses the [`InstrumentContext.transfer()`](index.html#opentrons.protocol_api.InstrumentContext.transfer 'opentrons.protocol_api.InstrumentContext.transfer') method to move liquid between well plates. The source and destination well arguments (e.g., `plate["A1"], plate["B1"]`) are part of `transfer()` method parameters. You don’t need separate calls to `aspirate` or `dispense` here.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D2")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack_1])
    # transfer 100 µL from well A1 to well B1
    pipette.transfer(100, plate["A1"], plate["B1"])

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
            load_name="opentrons_96_tiprack_300ul",
            location=2)
    p300 = protocol.load_instrument(
        instrument_name="p300_single",
        mount="left",
        tip_racks=[tiprack_1])
    # transfer 100 µL from well A1 to well B1
    p300.transfer(100, plate["A1"], plate["B1"])

```

### Loops

In Python, a loop is an instruction that keeps repeating an action until a specific condition is met.

When used in a protocol, loops automate repetitive steps such as aspirating and dispensing liquids from a reservoir to a a range of wells, or all the wells, in a well plate. For example, this code sample loops through the numbers 0 to 7, and uses the loop’s current value to transfer liquid from all the wells in a reservoir to all the wells in a 96\-well plate.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel":"2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D2")
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location="D3")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack_1])

    # distribute 20 µL from reservoir:A1 -> plate:row:1
    # distribute 20 µL from reservoir:A2 -> plate:row:2
    # etc...
    # range() starts at 0 and stops before 8, creating a range of 0-7
    for i in range(8):
        pipette.distribute(200, reservoir.wells()[i], plate.rows()[i])

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=2)
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location=4)
    p300 = protocol.load_instrument(
        instrument_name="p300_single",
        mount="left",
        tip_racks=[tiprack_1])

    # distribute 20 µL from reservoir:A1 -> plate:row:1
    # distribute 20 µL from reservoir:A2 -> plate:row:2
    # etc...
    # range() starts at 0 and stops before 8, creating a range of 0-7
    for i in range(8):
        p300.distribute(200, reservoir.wells()[i], plate.rows()[i])

```

Notice here how Python’s [`range`](https://docs.python.org/3/library/stdtypes.html#range '(in Python v3.12)') class (e.g., `range(8)`) determines how many times the code loops. Also, in Python, a range of numbers is _exclusive_ of the end value and counting starts at 0, not 1\. For the Corning 96\-well plate used here, this means well A1\=0, B1\=1, C1\=2, and so on to the last well in the row, which is H1\=7\.

### Multiple Air Gaps

Opentrons electronic pipettes can do some things that a human cannot do with a pipette, like accurately alternate between liquid and air aspirations that create gaps within the same tip. The protocol shown below shows you how to aspirate from the first five wells in the reservoir and create an air gap between each sample.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel":"2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_1000ul",
        location="D2")
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location="D3")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack_1])

    pipette.pick_up_tip()

    # aspirate from the first 5 wells
    for well in reservoir.wells()[:5]:
        pipette.aspirate(volume=35, location=well)
        pipette.air_gap(10)

    pipette.dispense(225, plate["A1"])

    pipette.return_tip()

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=2)
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location=3)
    p300 = protocol.load_instrument(
        instrument_name="p300_single",
        mount="right",
        tip_racks=[tiprack_1])

    p300.pick_up_tip()

    # aspirate from the first 5 wells
    for well in reservoir.wells()[:5]:
        p300.aspirate(volume=35, location=well)
        p300.air_gap(10)

    p300.dispense(225, plate["A1"])

    p300.return_tip()

```

Notice here how Python’s [`slice`](https://docs.python.org/3/library/functions.html#slice '(in Python v3.12)') functionality (in the code sample as `[:5]`) lets us select the first five wells of the well plate only. Also, in Python, a range of numbers is _exclusive_ of the end value and counting starts at 0, not 1\. For the USA Scientific 12\-well reservoir used here, this means well A1\=0, A2\=1, A3\=2, and so on to the last well used, which is A5\=4\. See also, the [Commands](index.html#tutorial-commands) section of the Tutorial.

### Dilution

This protocol dispenses diluent to all wells of a Corning 96\-well plate. Next, it dilutes 8 samples from the reservoir across all 8 columns of the plate.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D2")
    tiprack_2 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D3")
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location="C1")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="left",
        tip_racks=[tiprack_1, tiprack_2])
    # Dispense diluent
    pipette.distribute(50, reservoir["A12"], plate.wells())

    # loop through each row
    for i in range(8):
        # save the source well and destination column to variables
        source = reservoir.wells()[i]
        row = plate.rows()[i]

    # transfer 30 µL of source to first well in column
    pipette.transfer(30, source, row[0], mix_after=(3, 25))

    # dilute the sample down the column
    pipette.transfer(
        30, row[:11], row[1:],
        mix_after=(3, 25))

```

### OT-2

```
from opentrons import protocol_api

metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=2)
    tiprack_2 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=3)
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location=4)
    p300 = protocol.load_instrument(
        instrument_name="p300_single",
        mount="right",
        tip_racks=[tiprack_1, tiprack_2])
    # Dispense diluent
    p300.distribute(50, reservoir["A12"], plate.wells())

    # loop through each row
    for i in range(8):
        # save the source well and destination column to variables
        source = reservoir.wells()[i]
        source = reservoir.wells()[i]
        row = plate.rows()[i]

    # transfer 30 µL of source to first well in column
    p300.transfer(30, source, row[0], mix_after=(3, 25))

    # dilute the sample down the column
    p300.transfer(
        30, row[:11], row[1:],
        mix_after=(3, 25))

```

Notice here how the code sample loops through the rows and uses slicing to distribute the diluent. For information about these features, see the Loops and Air Gaps examples above. See also, the [Commands](index.html#tutorial-commands) section of the Tutorial.

### Plate Mapping

This protocol dispenses different volumes of liquids to a well plate and automatically refills the pipette when empty.

### Flex

```
from opentrons import protocol_api

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location="D1")
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D2")
    tiprack_2 = protocol.load_labware(
        load_name="opentrons_flex_96_tiprack_200ul",
        location="D3")
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location="C1")
    trash = protocol.load_trash_bin("A3")
    pipette = protocol.load_instrument(
        instrument_name="flex_1channel_1000",
        mount="right",
    tip_racks=[tiprack_1, tiprack_2])

    # Volume amounts are for demonstration purposes only
    water_volumes = [
        1,  2,  3,  4,  5,  6,  7,  8,
        9,  10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24,
        25, 26, 27, 28, 29, 30, 31, 32,
        33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64,
        65, 66, 67, 68, 69, 70, 71, 72,
        73, 74, 75, 76, 77, 78, 79, 80,
        81, 82, 83, 84, 85, 86, 87, 88,
        89, 90, 91, 92, 93, 94, 95, 96
        ]

    pipette.distribute(water_volumes, reservoir["A12"], plate.wells())

```

### OT-2

```
from opentrons import protocol_api
metadata = {"apiLevel": "2.19"}

def run(protocol: protocol_api.ProtocolContext):
    plate = protocol.load_labware(
        load_name="corning_96_wellplate_360ul_flat",
        location=1)
    tiprack_1 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=2)
    tiprack_2 = protocol.load_labware(
        load_name="opentrons_96_tiprack_300ul",
        location=3)
    reservoir = protocol.load_labware(
        load_name="usascientific_12_reservoir_22ml",
        location=4)
    p300 = protocol.load_instrument(
        instrument_name="p300_single",
        mount="right",
        tip_racks=[tiprack_1, tiprack_2])

    # Volume amounts are for demonstration purposes only
    water_volumes = [
        1,  2,  3,  4,  5,  6,  7,  8,
        9,  10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24,
        25, 26, 27, 28, 29, 30, 31, 32,
        33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64,
        65, 66, 67, 68, 69, 70, 71, 72,
        73, 74, 75, 76, 77, 78, 79, 80,
        81, 82, 83, 84, 85, 86, 87, 88,
        89, 90, 91, 92, 93, 94, 95, 96
        ]

    p300.distribute(water_volumes, reservoir["A12"], plate.wells())

```

## Adapting OT\-2 Protocols for Flex

Python protocols designed to run on the OT\-2 can’t be directly run on Flex without some modifications. This page describes the minimal steps that you need to take to get OT\-2 protocols analyzing and running on Flex.

Adapting a protocol for Flex lets you have parity across different Opentrons robots in your lab, or you can extend older protocols to take advantage of new features only available on Flex. Depending on your application, you may need to do additional verification of your adapted protocol.

Examples on this page are in tabs so you can quickly move back and forth to see the differences between OT\-2 and Flex code.

### Metadata and Requirements

Flex requires you to specify an `apiLevel` of 2\.15 or higher. If your OT\-2 protocol specified `apiLevel` in the `metadata` dictionary, it’s best to move it to the `requirements` dictionary. You can’t specify it in both places, or the API will raise an error.

Note

Consult the [list of changes in API versions](index.html#version-notes) to see what effect raising the `apiLevel` will have. If you increased it by multiple minor versions to get your protocol running on Flex, make sure that your protocol isn’t using removed commands or commands whose behavior has changed in a way that may affect your scientific results.

You also need to specify `"robotType": "Flex"`. If you omit `robotType` in the `requirements` dictionary, the API will assume the protocol is designed for the OT\-2\.

### Original OT-2 code

```
from opentrons import protocol_api

metadata = {
    "protocolName": "My Protocol",
    "description": "This protocol uses the OT-2",
    "apiLevel": "2.19"
}

```

### Updated Flex code

```
from opentrons import protocol_api

metadata = {
    "protocolName": "My Protocol",
    "description": "This protocol uses the Flex",
}

requirements = {"robotType": "Flex", "apiLevel": "2.19"}

```

### Pipettes and Tip\-rack Load Names

Flex uses different types of pipettes and tip racks than OT\-2, which have their own load names in the API. If possible, load Flex pipettes of the same capacity or larger than the OT\-2 pipettes. See the [list of pipette API load names](index.html#new-pipette-models) for the valid values of `instrument_name` in Flex protocols. And check [Labware Library](https://labware.opentrons.com) or the Opentrons App for the load names of Flex tip racks.

Note

If you use smaller capacity tips than in the OT\-2 protocol, you may need to make further adjustments to avoid running out of tips. Also, the protocol may have more steps and take longer to execute.

This example converts OT\-2 code that uses a P300 Single\-Channel GEN2 pipette and 300 µL tips to Flex code that uses a Flex 1\-Channel 1000 µL pipette and 1000 µL tips.

### Original OT-2 code

```
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    left_pipette = protocol.load_instrument(
        "p300_single_gen2", "left", tip_racks=[tips]
    )

```

### Updated Flex code

```
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "D1")
    left_pipette = protocol.load_instrument(
        "flex_1channel_1000", "left", tip_racks[tips]
    )

```

### Trash Container

OT\-2 protocols always have a [`fixed_trash`](index.html#opentrons.protocol_api.ProtocolContext.fixed_trash 'opentrons.protocol_api.ProtocolContext.fixed_trash') in slot 12\. In Flex protocols specifying API version 2\.16 or later, you need to [load a trash bin](index.html#configure-trash-bin). Put it in slot A3 to match the physical position of the OT\-2 fixed trash:

```
trash = protocol.load_trash_bin("A3")

```

### Deck Slot Labels

It’s good practice to update numeric labels for [deck slots](index.html#deck-slots) (which match the labels on an OT\-2\) to coordinate ones (which match the labels on Flex). This is an optional step, since the two formats are interchangeable.

For example, the code in the previous section changed the location of the tip rack from `1` to `"D1"`.

### Module Load Names

If your OT\-2 protocol uses older generations of the Temperature Module or Thermocycler Module, update the load names you pass to [`load_module()`](index.html#opentrons.protocol_api.ProtocolContext.load_module 'opentrons.protocol_api.ProtocolContext.load_module') to ones compatible with Flex:

> - `temperature module gen2`
> - `thermocycler module gen2` or `thermocyclerModuleV2`

The Heater\-Shaker Module only has one generation, `heaterShakerModuleV1`, which is compatible with Flex and OT\-2\.

The Magnetic Module is not compatible with Flex. For protocols that load `magnetic module`, `magdeck`, or `magnetic module gen2`, you will need to make further modifications to use the [Magnetic Block](index.html#magnetic-block) and Flex Gripper instead. This will require reworking some of your protocol steps, and you should verify that your new protocol design achieves similar results.

This simplified example, taken from a DNA extraction protocol, shows how using the Flex Gripper and the Magnetic Block can save time. Instead of pipetting an entire plate’s worth of liquid from the Heater\-Shaker to the Magnetic Module and then engaging the module, the gripper moves the plate to the Magnetic Block in one step.

### Original OT-2 code

```
hs_mod.set_and_wait_for_shake_speed(2000)
protocol.delay(minutes=5)
hs_mod.deactivate_shaker()

for i in sample_plate.wells():
    # mix, transfer, and blow-out all samples
    pipette.pick_up_tip()
    pipette.aspirate(100,hs_plate[i])
    pipette.dispense(100,hs_plate[i])
    pipette.aspirate(100,hs_plate[i])
    pipette.air_gap(10)
    pipette.dispense(pipette.current_volume,mag_plate[i])
    pipette.aspirate(50,hs_plate[i])
    pipette.air_gap(10)
    pipette.dispense(pipette.current_volume,mag_plate[i])
    pipette.blow_out(mag_plate[i].bottom(0.5))
    pipette.drop_tip()

mag_mod.engage()

# perform elution steps

```

### Updated Flex code

```
hs_mod.set_and_wait_for_shake_speed(2000)
protocol.delay(minutes=5)
hs_mod.deactivate_shaker()

# move entire plate
# no pipetting from Heater-Shaker needed
hs_mod.open_labware_latch()
protocol.move_labware(sample_plate, mag_block, use_gripper=True)

# perform elution steps

```

The Opentrons Python Protocol API is a Python framework designed to make it easy to write automated biology lab protocols. Python protocols can control Opentrons Flex and OT\-2 robots, their pipettes, and optional hardware modules. We’ve designed the API to be accessible to anyone with basic Python and wet\-lab skills.

As a bench scientist, you should be able to code your protocols in a way that reads like a lab notebook. You can write a fully functional protocol just by listing the equipment you’ll use (modules, labware, and pipettes) and the exact sequence of movements the robot should make.

As a programmer, you can leverage the full power of Python for advanced automation in your protocols. Perform calculations, manage external data, use built\-in and imported Python modules, and more to implement your custom lab workflow.

## Getting Started

**New to Python protocols?** Check out the [Tutorial](index.html#tutorial) to learn about the different parts of a protocol file and build a working protocol from scratch.

If you want to **dive right into code**, take a look at our [Protocol Examples](index.html#new-examples) and the comprehensive [API Version 2 Reference](index.html#protocol-api-reference).

When you’re ready to **try out a protocol**, download the [Opentrons App](https://www.opentrons.com/ot-app), import the protocol file, and run it on your robot.

## How the API Works

The design goal of this API is to make code readable and easy to understand. A protocol, in its most basic form:

1. Provides some information about who made the protocol and what it is for.
2. Specifies which type of robot the protocol should run on.
3. Tells the robot where to find labware, pipettes, and (optionally) hardware modules.
4. Commands the robot to manipulate its attached hardware.

For example, if we wanted to transfer liquid from well A1 to well B1 on a plate, our protocol would look like:

### Flex

```
from opentrons import protocol_api

# metadata
metadata = {
    "protocolName": "My Protocol",
    "author": "Name <opentrons@example.com>",
    "description": "Simple protocol to get started using the Flex",
}

# requirements
requirements = {"robotType": "Flex", "apiLevel": "2.19"}

# protocol run function
def run(protocol: protocol_api.ProtocolContext):
    # labware
    plate = protocol.load_labware(
        "corning_96_wellplate_360ul_flat", location="D1"
    )
    tiprack = protocol.load_labware(
        "opentrons_flex_96_tiprack_200ul", location="D2"
    )
    trash = protocol.load_trash_bin(location="A3")

    # pipettes
    left_pipette = protocol.load_instrument(
        "flex_1channel_1000", mount="left", tip_racks=[tiprack]
    )

    # commands
    left_pipette.pick_up_tip()
    left_pipette.aspirate(100, plate["A1"])
    left_pipette.dispense(100, plate["B2"])
    left_pipette.drop_tip()

```

This example proceeds completely linearly. Following it line\-by\-line, you can see that it has the following effects:

1. Gives the name, contact information, and a brief description for the protocol.
2. Indicates the protocol should run on a Flex robot, using API version 2\.19\.
3. Tells the robot that there is:
   1. A 96\-well flat plate in slot D1\.
   2. A rack of 300 µL tips in slot D2\.
   3. A 1\-channel 1000 µL pipette attached to the left mount, which should pick up tips from the aforementioned rack.
4. Tells the robot to act by:
   1. Picking up the first tip from the tip rack.
   2. Aspirating 100 µL of liquid from well A1 of the plate.
   3. Dispensing 100 µL of liquid into well B1 of the plate.
   4. Dropping the tip in the trash.

### OT-2

```
from opentrons import protocol_api

# metadata
metadata = {
    "protocolName": "My Protocol",
    "author": "Name <opentrons@example.com>",
    "description": "Simple protocol to get started using the OT-2",
}

# requirements
requirements = {"robotType": "OT-2", "apiLevel": "2.19"}

# protocol run function
def run(protocol: protocol_api.ProtocolContext):
    # labware
    plate = protocol.load_labware(
        "corning_96_wellplate_360ul_flat", location="1"
    )
    tiprack = protocol.load_labware(
        "opentrons_96_tiprack_300ul", location="2"
    )

    # pipettes
    left_pipette = protocol.load_instrument(
        "p300_single", mount="left", tip_racks=[tiprack]
    )

    # commands
    left_pipette.pick_up_tip()
    left_pipette.aspirate(100, plate["A1"])
    left_pipette.dispense(100, plate["B2"])
    left_pipette.drop_tip()

```

This example proceeds completely linearly. Following it line\-by\-line, you can see that it has the following effects:

1. Gives the name, contact information, and a brief description for the protocol.
2. Indicates the protocol should run on an OT\-2 robot, using API version 2\.19\.
3. Tells the robot that there is:
   1. A 96\-well flat plate in slot 1\.
   2. A rack of 300 µL tips in slot 2\.
   3. A single\-channel 300 µL pipette attached to the left mount, which should pick up tips from the aforementioned rack.
4. Tells the robot to act by:
   1. Picking up the first tip from the tip rack.
   2. Aspirating 100 µL of liquid from well A1 of the plate.
   3. Dispensing 100 µL of liquid into well B1 of the plate.
   4. Dropping the tip in the trash.

There is much more that Opentrons robots and the API can do! The [Building Block Commands](index.html#v2-atomic-commands), [Complex Commands](index.html#v2-complex-commands), and [Hardware Modules](index.html#new-modules) pages cover many of these functions.

## More Resources

### Opentrons App

The [Opentrons App](https://opentrons.com/ot-app/) is the easiest way to run your Python protocols. The app runs on the latest versions of macOS, Windows, and Ubuntu.

### Support

Questions about setting up your robot, using Opentrons software, or troubleshooting? Check out our [support articles](https://support.opentrons.com/s/) or [contact Opentrons Support directly](mailto:support%40opentrons.com).

### Custom Protocol Service

Don’t have the time or resources to write your own protocols? Our [custom protocol development service](https://opentrons.com/instrument-services/) can get you set up in two weeks.

### Contributing

Opentrons software, including the Python API and this documentation, is open source. If you have an improvement or an interesting idea, you can create an issue on GitHub by following our [guidelines](https://github.com/Opentrons/opentrons/blob/edge/CONTRIBUTING.md#opening-issues).

That guide also includes more information on how to [directly contribute code](https://github.com/Opentrons/opentrons/blob/edge/CONTRIBUTING.md).
