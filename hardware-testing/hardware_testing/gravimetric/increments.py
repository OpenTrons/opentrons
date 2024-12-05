"""Increments."""
from typing import List

INCREMENTS = {
    1: {
        50: {
            50: {
                "default": [
                    1.100,
                    1.200,
                    1.370,
                    1.700,
                    2.040,
                    2.660,
                    3.470,
                    3.960,
                    4.350,
                    4.800,
                    5.160,
                    5.890,
                    6.730,
                    8.200,
                    10.020,
                    11.100,
                    14.910,
                    28.940,
                    53.500,
                    56.160,
                ],
                "lowVolumeDefault": [
                    1.100,
                    1.200,
                    1.370,
                    1.700,
                    2.040,
                    2.660,
                    3.470,
                    3.960,
                    4.350,
                    4.800,
                    5.160,
                    5.890,
                    6.730,
                    8.200,
                    10.020,
                    11.100,
                    14.910,
                    28.940,
                    48.27,
                ],
            }
        },
        1000: {
            50: {
                "default": [
                    2.530,
                    2.700,
                    3.000,
                    3.600,
                    4.040,
                    4.550,
                    5.110,
                    5.500,
                    5.750,
                    6.000,
                    6.460,
                    7.270,
                    8.170,
                    11.000,
                    12.900,
                    16.510,
                    26.400,
                    33.380,
                    53.360,
                    60.000,
                ],
            },
            200: {
                "default": [
                    3.250,
                    3.600,
                    4.400,
                    6.220,
                    7.310,
                    8.600,
                    11.890,
                    13.990,
                    22.750,
                    36.990,
                    56.000,
                    97.830,
                    159.090,
                    187.080,
                    220.000,
                ],
            },
            1000: {
                "default": [
                    3.000,
                    4.000,
                    5.000,
                    7.270,
                    12.800,
                    15.370,
                    18.530,
                    56.950,
                    99.840,
                    120.380,
                    254.480,
                    369.990,
                    446.130,
                    648.650,
                    1030.000,
                    1137.160,
                ],
            },
        },
    },
    8: {
        50: {  # FIXME: need to update based on PVT data
            50: {
                "default": [
                    0.80,
                    1.00,
                    1.25,
                    1.57,
                    1.96,
                    2.45,
                    3.06,
                    3.30,
                    3.60,
                    3.83,
                    4.00,
                    4.30,
                    4.60,
                    4.79,
                    5.30,
                    5.99,
                    7.49,
                    9.37,
                    11.72,
                    18.34,
                    22.93,
                    28.68,
                    35.88,
                    44.87,
                    56.12,
                ],
                "lowVolumeDefault": [
                    0.80,
                    1.00,
                    1.25,
                    1.57,
                    1.96,
                    2.45,
                    3.06,
                    3.30,
                    3.60,
                    3.83,
                    4.00,
                    4.30,
                    4.60,
                    4.79,
                    5.30,
                    5.99,
                    7.49,
                    9.37,
                    11.72,
                    18.34,
                    22.93,
                    28.68,
                    35.88,
                    48.27,
                ],
            }
        },
        1000: {  # FIXME: need to update based on PVT data
            50: {
                "default": [
                    1.00,
                    1.24,
                    1.54,
                    1.91,
                    2.37,
                    2.94,
                    3.64,
                    3.90,
                    4.20,
                    4.52,
                    4.80,
                    5.10,
                    5.61,
                    5.90,
                    6.20,
                    6.95,
                    8.63,
                    10.70,
                    13.28,
                    16.47,
                    20.43,
                    25.34,
                    31.43,
                    38.99,
                    48.37,
                    60.00,
                ],
            },
            200: {
                "default": [
                    1.50,
                    1.85,
                    2.27,
                    2.80,
                    3.44,
                    4.24,
                    5.22,
                    6.43,
                    7.91,
                    9.74,
                    11.99,
                    14.76,
                    18.17,
                    22.36,
                    27.53,
                    33.89,
                    41.72,
                    51.35,
                    63.22,
                    77.82,
                    95.80,
                    117.93,
                    145.18,
                    178.71,
                    220.00,
                ],
            },
            1000: {
                "default": [
                    2.00,
                    2.61,
                    3.39,
                    4.42,
                    5.76,
                    7.50,
                    9.77,
                    12.72,
                    16.57,
                    21.58,
                    28.11,
                    36.61,
                    47.69,
                    62.11,
                    80.91,
                    105.38,
                    137.26,
                    178.78,
                    232.87,
                    303.31,
                    395.07,
                    514.58,
                    670.25,
                    873.00,
                    1137.10,
                ],
            },
        },
    },
    96: {
        200: {
            20: {
                "default": [
                    0.2000,
                    0.500,
                    1.000,
                    3.000,
                    5.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    15.000,
                    22.000,
                ],
            },
            50: {
                "default": [
                    0.700,
                    1.000,
                    1.500,
                    2.000,
                    2.500,
                    3.000,
                    4.000,
                    5.000,
                    6.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    15.000,
                    25.000,
                    40.000,
                    60.000,
                ],
            },
            200: {
                "default": [
                    2.000,
                    3.000,
                    4.000,
                    5.000,
                    6.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    50.000,
                    100.000,
                    220.000,
                ],
            },
        },
        1000: {  # FIXME: need to update based on DVT data
            50: {
                "default": [
                    2.000,
                    3.000,
                    4.000,
                    5.000,
                    6.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    15.000,
                    25.000,
                    40.000,
                    60.000,
                ],
            },
            200: {
                "default": [
                    2.000,
                    3.000,
                    4.000,
                    5.000,
                    6.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    50.000,
                    100.000,
                    220.000,
                ],
            },
            1000: {
                "default": [
                    2.000,
                    3.000,
                    4.000,
                    5.000,
                    6.000,
                    7.000,
                    8.000,
                    9.000,
                    10.000,
                    50.000,
                    200.000,
                    1137.10,
                ],
            },
        },
    },
}


def get_volume_increments(
    channels: int, pipette_volume: int, tip_volume: int, mode: str = ""
) -> List[float]:
    """Get volume increments."""
    try:
        mode = mode if mode else "default"
        return INCREMENTS[channels][pipette_volume][tip_volume][mode]
    except KeyError:
        raise ValueError(
            f"unexpected channel-pipette-tip combo: {channels}ch P{pipette_volume} w/ T{tip_volume}"
        )
