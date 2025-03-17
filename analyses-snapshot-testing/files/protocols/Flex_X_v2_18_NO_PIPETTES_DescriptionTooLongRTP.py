metadata = {
    "protocolName": "Description too long",
}

requirements = {"robotType": "Flex", "apiLevel": "2.18"}

# This was the previous test and did not fail.
# the character limit is 100 not 30
# too_long: str = "This is a description that is longer than 30 characters."

# a string with characters
too_long = "a" * 101


def add_parameters(parameters):
    parameters.add_int(
        display_name="display name",
        variable_name="dilutions",
        default=1,
        minimum=1,
        maximum=3,
        description=too_long,
    )


def run(context):
    for variable_name, value in context.params.get_all().items():
        context.comment(f"variable {variable_name} has value {value}")
