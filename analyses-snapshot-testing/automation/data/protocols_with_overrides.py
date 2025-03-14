from automation.data.protocol_with_overrides import ProtocolWithOverrides


class ProtocolsWithOverrides:
    Flex_X_v2_18_NO_PIPETTES_Overrides_BadTypesInRTP: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_X_v2_18_NO_PIPETTES_Overrides_BadTypesInRTP",
        file_extension="py",
        robot="Flex",
        override_variable_name="type_to_test",
        overrides=[
            "wrong_type_in_display_name",
            "wrong_type_in_variable_name",
            "wrong_type_in_choice_display_name",
            "wrong_type_in_choice_value",
            "wrong_type_in_default",
            "wrong_type_in_description",
            "wrong_type_in_minimum",
            "wrong_type_in_maximum",
            "wrong_type_in_unit",  # we going unit or suffix?
        ],
    )

    Flex_X_v2_18_NO_PIPETTES_Overrides_DefaultOutOfRangeRTP: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_X_v2_18_NO_PIPETTES_Overrides_DefaultOutOfRangeRTP",
        file_extension="py",
        robot="Flex",
        override_variable_name="type_to_test",
        overrides=[
            "default_greater_than_maximum",
            "default_less_than_minimum",
        ],
    )

    Flex_X_v2_18_NO_PIPETTES_Overrides_DefaultChoiceNoMatchChoice: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_X_v2_18_NO_PIPETTES_Overrides_DefaultChoiceNoMatchChoice",
        file_extension="py",
        robot="Flex",
        override_variable_name="type_to_test",
        overrides=["str_default_no_matching_choices", "float_default_no_matching_choices", "int_default_no_matching_choices"],
    )

    # analyses-snapshot-testing/files/protocols/Flex_X_v2_20_96_and_8_Overrides_InvalidConfigs.py

    Flex_X_v2_20_96_and_8_Overrides_InvalidConfigs: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_X_v2_20_96_and_8_Overrides_InvalidConfigs",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "ninety_six_partial_column_1",
            "ninety_six_partial_column_2",
            "ninety_six_partial_column_3",
            "eight_partial_column_bottom_left",
            "eight_partial_column_bottom_right",
            "eight_partial_column_no_end",
            "return_tip_error",
            "drop_tip_with_location",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_X_v2_20_96_None_Overrides_TooTallLabware.py

    Flex_X_v2_20_96_None_Overrides_TooTallLabware: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_X_v2_20_96_None_Overrides_TooTallLabware",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "transfer_source_collision",
            "transfer_destination_collision",
            "c3_right_edge",
            "north",
            "north_west",
            "west",
            "south_west",
            "south",
            "south_east",
            "east",
            "east_column",
            "west_column",
            "north_row",
            "south_row",
            "top_edge",
            "bottom_left_edge",
            "bottom_left_edge",
            "bottom_right_edge",
            "mix_collision",
            "consolidate_source_collision",
            "consolidate_destination_collision",
            "distribute_source_collision",
            "distribute_destination_collision",
        ],
    )

    # analyses-snapshot-testing/files/protocols/OT2_X_v2_20_8_Overrides_InvalidConfigs.py

    OT2_X_v2_20_8_Overrides_InvalidConfigs: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="OT2_X_v2_20_8_Overrides_InvalidConfigs",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "eight_partial_column_bottom_left",
            "eight_partial_column_bottom_right",
            "eight_partial_column_no_end",
            "return_tip_error",
            "drop_tip_with_location",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_S_v2_23_96_HappyPath_Overrides_transfer_liquid.py
    Flex_S_v2_23_96_HappyPath_Overrides_transfer_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_96_HappyPath_Overrides_transfer_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )

    # Flex_S_v2_23_96_HappyPath_Overrides_distribute_liquid.py
    Flex_S_v2_23_96_HappyPath_Overrides_distribute_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_96_HappyPath_Overrides_distribute_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_S_v2_23_96_HappyPath_Overrides_consolidate_liquid.py

    Flex_S_v2_23_96_HappyPath_Overrides_consolidate_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_96_HappyPath_Overrides_consolidate_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_transfer_liquid.py

    Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_transfer_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_transfer_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_consolidate_liquid.py

    Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_consolidate_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_consolidate_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )

    # analyses-snapshot-testing/files/protocols/Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_distribute_liquid.py
    Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_distribute_liquid: ProtocolWithOverrides = ProtocolWithOverrides(
        file_stem="Flex_S_v2_23_P1000_8ch_None_HappyPath_Overrides_distribute_liquid",
        file_extension="py",
        robot="Flex",
        override_variable_name="key",
        overrides=[
            "50",
            "50_filter",
            "200",
            "200_filter",
            "1000",
            "1000_filter",
        ],
    )
