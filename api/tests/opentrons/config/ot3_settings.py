from opentrons.config.types import OutputOptions

ot3_dummy_settings = {
    "name": "Marie Curie",
    "model": "OT-3 Standard",
    "version": 1,
    "motion_settings": {
        "acceleration": {
            "low_throughput": {
                "X": 3,
                "Y": 2,
                "Z": 15,
                "P": 15,
                "Z_G": 5,
            },
            "high_throughput": {
                "X": 3,
                "Y": 2,
                "Z": 15,
                "P": 15,
                "Q": 5,
                "Z_G": 5,
            },
        },
        "default_max_speed": {
            "low_throughput": {
                "X": 1,
                "Y": 2,
                "Z": 3,
                "P": 4,
                "Z_G": 5,
            },
            "high_throughput": {
                "X": 1,
                "Y": 2,
                "Z": 3,
                "P": 4,
                "Q": 5,
                "Z_G": 6,
            },
        },
        "max_speed_discontinuity": {
            "low_throughput": {
                "X": 10,
                "Y": 20,
                "Z": 30,
                "P": 40,
                "Z_G": 50,
            },
            "high_throughput": {
                "X": 1,
                "Y": 2,
                "Z": 3,
                "P": 6,
                "Q": 5,
                "Z_G": 7,
            },
        },
        "direction_change_speed_discontinuity": {
            "low_throughput": {
                "X": 5,
                "Y": 10,
                "Z": 15,
                "P": 20,
                "Z_G": 15,
            },
            "high_throughput": {
                "X": 1,
                "Y": 2,
                "Z": 3,
                "P": 6,
                "Q": 5,
                "Z_G": 15,
            },
        },
    },
    "current_settings": {
        "hold_current": {
            "low_throughput": {
                "X": 0.7,
                "Y": 0.7,
                "Z": 0.7,
                "P": 0.8,
                "Z_G": 0.5,
            },
            "high_throughput": {
                "X": 0.7,
                "Y": 0.7,
                "Z": 0.7,
                "P": 0.8,
                "Q": 0.3,
                "Z_G": 0.5,
            },
        },
        "run_current": {
            "low_throughput": {
                "X": 7.0,
                "Y": 7.0,
                "Z": 7.0,
                "P": 5.0,
                "Z_G": 5.0,
            },
            "high_throughput": {
                "X": 0.2,
                "Y": 0.5,
                "Z": 0.4,
                "P": 2.0,
                "Q": 0.3,
                "Z_G": 0.5,
            },
        },
    },
    "log_level": "NADA",
    "safe_home_distance": 5,
    "deck_transform": [[-0.5, 0, 1], [0.1, -2, 4], [0, 0, -1]],
    "carriage_offset": (1, 2, 3),
    "right_mount_offset": (3, 2, 1),
    "left_mount_offset": (2, 2, 2),
    "gripper_mount_offset": (1, 1, 1),
    "liquid_sense": {
        "starting_mount_height": 80,
        "max_z_distance": 20,
        "min_z_distance": 3,
        "mount_speed": 10,
        "plunger_speed": 10,
        "sensor_threshold_pascals": 17,
        "expected_liquid_height": 90,
        "output_option": OutputOptions.stream_to_csv,
        "aspirate_while_sensing": False,
        "auto_zero_sensor": True,
        "num_baseline_reads": 10,
        "data_file": "/var/pressure_sensor_data.csv",
    },
    "calibration": {
        "z_offset": {
            "pass_settings": {
                "prep_distance_mm": 1,
                "max_overrun_distance_mm": 2,
                "speed_mm_per_s": 3,
                "sensor_threshold_pf": 4,
            },
        },
        "edge_sense": {
            "overrun_tolerance_mm": 2,
            "early_sense_tolerance_mm": 17,
            "pass_settings": {
                "prep_distance_mm": 4,
                "max_overrun_distance_mm": 5,
                "speed_mm_per_s": 6,
                "sensor_threshold_pf": 7,
            },
            "search_initial_tolerance_mm": 18,
            "search_iteration_limit": 3,
        },
        "probe_length": 40,
    },
}
