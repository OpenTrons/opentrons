"""Mock representations of potential circular frusta."""
"""
These are circular frusta whose radii either decay or grow, but always at a constant rate.
Height always decays from the max height to 0 in increments of 1.
"""
example_1 = {
    "height": [
        26,
        25,
        24,
        23,
        22,
        21,
        20,
        19,
        18,
        17,
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1,
        0,
    ],
    "radius": [
        8,
        10,
        12,
        14,
        16,
        18,
        20,
        22,
        24,
        26,
        28,
        30,
        32,
        34,
        36,
        38,
        40,
        42,
        44,
        46,
        48,
        50,
        52,
        54,
        56,
        58,
        60,
    ],
}
example_2 = {
    "height": [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    "radius": [
        67,
        68.5,
        70,
        71.5,
        73,
        74.5,
        76,
        77.5,
        79,
        80.5,
        82,
        83.5,
        85,
        86.5,
        88,
        89.5,
        91,
        92.5,
        94,
    ],
}
example_3 = {
    "height": [
        20,
        19,
        18,
        17,
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1,
        0,
    ],
    "radius": [
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
        32,
    ],
}
example_4 = {
    "height": [
        34,
        33,
        32,
        31,
        30,
        29,
        28,
        27,
        26,
        25,
        24,
        23,
        22,
        21,
        20,
        19,
        18,
        17,
        16,
        15,
        14,
        13,
        12,
        11,
        10,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1,
        0,
    ],
    "radius": [
        280,
        274.5,
        269,
        263.5,
        258,
        252.5,
        247,
        241.5,
        236,
        230.5,
        225,
        219.5,
        214,
        208.5,
        203,
        197.5,
        192,
        186.5,
        181,
        175.5,
        170,
        164.5,
        159,
        153.5,
        148,
        142.5,
        137,
        131.5,
        126,
        120.5,
        115,
        109.5,
        104,
        98.5,
        93,
    ],
}

TEST_EXAMPLES = [example_1, example_2, example_3, example_4]
