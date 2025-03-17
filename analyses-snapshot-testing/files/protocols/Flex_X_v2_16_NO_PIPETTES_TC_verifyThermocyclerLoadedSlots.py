# Pulled from: https://github.com/Opentrons/opentrons/pull/14491


requirements = {
    "robotType": "Flex",
    "apiLevel": "2.16",
}


def run(protocol):
    thermocycler = protocol.load_module("thermocycler module gen2")

    assert protocol.loaded_modules == {"B1": thermocycler}
    assert protocol.deck["A1"] == thermocycler
