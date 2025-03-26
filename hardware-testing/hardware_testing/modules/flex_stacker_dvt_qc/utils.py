"""Utility functions for the Flex Stacker EVT QC module."""
from collections import defaultdict
import statistics
from typing import Dict, List
from opentrons.drivers.flex_stacker.driver import TOFSensor
from opentrons.drivers.flex_stacker.utils import NUMBER_OF_BINS, NUMBER_OF_ZONES
from hardware_testing.data import ui
from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
)

from .driver import FlexStackerInterface as FlexStacker
from opentrons.drivers.flex_stacker.types import StackerAxis, Direction


async def test_limit_switches_per_direction(
    stacker: FlexStacker,
    axis: StackerAxis,
    direction: Direction,
    report: CSVReport,
    section: str,
    speed: float | None = None,
    acceleration: float | None = None,
    current: float | None = None,
) -> None:
    """Sequence to test the limit switch for one direction."""
    ui.print_header(f"{axis} Limit Switch - {direction} direction")
    # first make sure switch is not already triggered by moving in the opposite direction
    if await stacker._driver.get_limit_switch(axis, direction):
        print(f"{direction} switch already triggered, moving away...\n")
        SAFE_DISTANCE_MM = 10

        await stacker.move_axis(
            axis, direction.opposite(), SAFE_DISTANCE_MM, speed, acceleration, current
        )

    # move until the limit switch is reached
    print(f"moving towards {direction} limit switch...\n")
    await stacker.home_axis(axis, direction, speed, acceleration, current)

    result = await stacker._driver.get_limit_switch(axis, direction)
    opposite_result = not await stacker._driver.get_limit_switch(
        axis, direction.opposite()
    )
    print(f"{direction} switch triggered: {result}")
    print(f"{direction.opposite()} switch untriggered: {opposite_result}")
    report(
        section,
        f"limit-switch-trigger-{direction}-untrigger-{direction.opposite()}",
        [result, opposite_result, CSVResult.from_bool(result and opposite_result)],
    )


# fmt: off
# type: ignore
TOF_BASELINE_X = {0: [76.74, 74.58, 80.44, 62.53, 88.55, 81.97, 58.71, 80.4, 82.03, 68.6, 92.74, 908.52, 6236.18, 63985.61, 111036.46, 61700.1, 73795.84, 53319.68, 26834.88, 15998.02, 11839.62, 10127.01, 9027.06, 8664.68, 7721.55, 7053.87, 5983.79, 41498.67, 56938.02, 52419.26, 77057.43, 61728.56, 35440.5, 17149.83, 8946.66, 5529.13, 4349.13, 3449.63, 3021.82, 2594.48, 2238.05, 1973.23, 1608.54, 1557.53, 1400.43, 1323.44, 1198.64, 1142.77, 1009.64, 933.76, 804.83, 900.99, 870.78, 797.39, 771.72, 658.07, 669.65, 672.14, 614.57, 549.72, 564.39, 519.23, 493.57, 495.59, 514.2, 449.52, 478.91, 437.27, 387.41, 410.49, 376.08, 398.79, 355.14, 346.83, 346.67, 344.59, 313.5, 288.27, 329.52, 340.6, 277.59, 280.19, 280.47, 261.67, 267.21, 257.49, 263.49, 262.85, 287.48, 212.02, 274.41, 235.0, 226.5, 242.53, 242.55, 201.82, 200.63, 199.49, 182.15, 200.87, 206.17, 164.72, 158.62, 162.24, 181.69, 178.31, 170.28, 144.65, 127.05, 135.67, 124.48, 138.82, 153.91, 144.88, 133.89, 140.73, 121.48, 131.17, 101.88, 139.23, 131.51, 125.63, 95.47, 105.82, 101.94, 106.12, 122.11, 103.28], 1: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 2: [51.71, 42.59, 43.2, 53.11, 41.42, 49.17, 52.89, 43.11, 40.58, 59.28, 60.51, 72.2, 76.41, 495.98, 403.02, 307.85, 227.51, 158.08, 173.86, 318.28, 473.11, 507.3, 505.21, 691.94, 967.92, 1477.82, 1601.01, 1125.76, 2318.44, 2452.28, 1548.67, 1284.62, 1178.87, 773.58, 363.59, 267.86, 192.95, 214.05, 126.53, 125.1, 122.45, 109.91, 103.12, 84.53, 83.22, 65.37, 61.85, 56.29, 55.3, 73.35, 53.89, 91.65, 191.99, 230.3, 174.38, 147.65, 144.5, 97.51, 60.78, 90.6, 162.78, 1813.76, 2308.92, 1725.4, 898.26, 646.8, 1089.58, 929.59, 626.87, 329.36, 232.18, 413.22, 545.47, 590.46, 769.93, 630.81, 396.52, 327.94, 250.87, 242.24, 282.16, 1353.2, 1348.13, 759.05, 608.43, 1268.1, 1031.2, 1996.32, 3711.7, 2960.28, 1339.06, 504.43, 305.1, 192.94, 149.66, 107.7, 106.48, 99.14, 78.01, 84.17, 91.56, 69.11, 64.28, 74.2, 60.75, 58.39, 418.95, 465.85, 330.81, 163.39, 286.42, 413.38, 275.86, 135.89, 103.76, 75.26, 70.82, 67.63, 215.21, 303.26, 252.4, 180.93, 111.68, 102.16, 490.19, 652.49, 502.93, 283.39], 3: [32.3, 40.33, 37.14, 30.18, 30.51, 33.16, 39.23, 48.23, 33.92, 33.98, 33.2, 42.5, 61.85, 257.19, 216.47, 161.67, 114.06, 70.85, 95.6, 141.12, 213.96, 228.96, 234.7, 384.4, 549.64, 585.2, 576.25, 630.08, 1896.83, 1946.79, 1190.52, 703.44, 511.27, 326.6, 176.31, 197.1, 1239.01, 1609.21, 1149.22, 508.7, 233.82, 155.27, 100.62, 102.28, 65.07, 73.48, 46.51, 38.87, 68.9, 59.89, 83.2, 185.13, 223.24, 186.88, 148.0, 84.86, 94.59, 84.11, 111.35, 208.2, 272.16, 922.2, 1211.27, 889.47, 418.69, 596.43, 765.75, 602.24, 671.87, 420.82, 283.92, 512.21, 585.59, 451.85, 567.01, 498.78, 269.67, 155.41, 103.77, 127.77, 114.67, 196.68, 261.94, 177.97, 295.66, 762.75, 605.58, 703.94, 1114.5, 762.63, 389.59, 163.3, 97.74, 70.92, 67.16, 67.38, 56.85, 45.79, 44.82, 47.86, 65.07, 55.54, 42.08, 52.88, 38.7, 43.88, 180.77, 449.12, 365.63, 177.59, 313.64, 520.31, 368.48, 142.35, 81.23, 62.3, 49.14, 43.69, 55.1, 77.62, 86.08, 73.07, 38.43, 98.68, 514.92, 536.84, 361.82, 165.3], 4: [47.68, 44.06, 49.8, 46.89, 59.35, 37.96, 60.5, 52.54, 41.78, 43.99, 47.72, 53.05, 47.85, 134.73, 245.51, 211.11, 114.94, 70.96, 86.53, 107.57, 154.54, 164.93, 155.14, 284.44, 760.89, 885.0, 598.28, 388.13, 2081.85, 4686.74, 4793.33, 3128.32, 1775.48, 1037.89, 747.63, 507.77, 1691.9, 4142.12, 4717.44, 3333.21, 1534.16, 634.47, 331.02, 220.5, 185.51, 145.29, 114.02, 76.04, 73.76, 135.35, 210.82, 268.34, 256.22, 182.45, 169.03, 118.71, 85.1, 95.8, 175.35, 542.44, 478.23, 367.35, 286.28, 490.17, 656.96, 548.51, 289.71, 189.23, 259.25, 452.69, 367.95, 196.48, 174.14, 248.28, 343.24, 359.88, 225.16, 131.02, 69.2, 51.86, 70.95, 82.98, 149.01, 193.01, 280.29, 479.42, 496.43, 328.79, 635.5, 623.35, 364.43, 155.21, 86.07, 77.88, 68.54, 62.83, 61.06, 56.56, 49.28, 57.54, 50.83, 46.29, 45.61, 61.05, 45.77, 62.98, 54.27, 136.93, 132.01, 84.16, 61.77, 143.53, 144.39, 99.29, 71.47, 59.55, 46.94, 78.67, 73.86, 69.92, 68.59, 61.2, 56.92, 53.13, 106.66, 206.27, 211.2, 139.29], 5: [30.25, 19.73, 25.65, 23.51, 17.66, 24.69, 23.36, 26.56, 32.29, 22.97, 31.29, 25.56, 51.53, 126.99, 244.93, 192.6, 84.44, 64.19, 61.91, 85.03, 170.19, 193.47, 182.1, 378.06, 916.58, 1082.99, 962.48, 30929.7, 77551.71, 109984.51, 78895.41, 34810.63, 14570.78, 8162.57, 5591.18, 4141.11, 3168.58, 2518.75, 1999.41, 1437.73, 979.47, 764.15, 705.25, 847.04, 827.74, 671.35, 392.68, 263.67, 150.51, 222.96, 189.92, 144.09, 162.23, 107.95, 79.76, 65.91, 55.28, 62.2, 201.56, 355.67, 271.12, 154.44, 114.76, 223.02, 217.87, 173.15, 127.95, 71.93, 56.94, 69.9, 64.18, 62.37, 90.36, 96.42, 131.01, 132.19, 97.06, 71.97, 52.91, 44.89, 34.8, 51.76, 95.59, 111.83, 153.21, 195.04, 231.22, 177.19, 285.93, 299.72, 172.9, 100.04, 71.41, 55.38, 58.51, 37.62, 37.74, 35.3, 43.8, 51.02, 34.97, 34.31, 30.97, 31.53, 23.85, 29.22, 29.56, 54.52, 66.53, 48.36, 36.1, 64.31, 42.73, 40.78, 31.85, 32.33, 44.61, 37.72, 46.18, 47.13, 30.16, 47.55, 36.56, 35.38, 65.2, 121.18, 140.47, 100.4], 6: [65.32, 63.18, 75.88, 59.75, 54.26, 67.76, 61.87, 60.85, 68.0, 68.82, 60.23, 68.83, 69.64, 185.92, 240.23, 188.08, 118.75, 81.86, 89.43, 140.3, 211.06, 232.92, 292.49, 737.19, 1466.87, 966.31, 599.58, 45320.31, 132703.59, 100392.25, 146959.7, 134932.66, 76874.7, 34552.96, 15768.96, 9368.83, 6361.18, 4717.24, 3811.26, 2873.02, 2202.55, 1665.43, 1357.3, 1072.21, 811.18, 923.17, 819.64, 683.14, 430.95, 284.82, 207.86, 155.44, 147.95, 116.71, 105.21, 100.91, 73.2, 81.76, 135.83, 148.21, 94.29, 80.76, 92.34, 86.87, 98.51, 101.97, 76.26, 79.29, 58.22, 79.57, 62.32, 59.48, 84.6, 69.61, 60.75, 83.23, 65.43, 76.26, 66.09, 67.94, 57.0, 66.04, 84.9, 73.66, 93.8, 104.71, 98.68, 92.79, 100.0, 82.59, 69.84, 55.43, 67.47, 60.42, 63.84, 64.66, 48.37, 57.28, 47.93, 63.84, 50.33, 56.46, 67.97, 64.63, 58.26, 67.95, 67.76, 61.23, 67.46, 67.73, 61.98, 66.65, 60.79, 57.27, 68.92, 70.29, 60.71, 73.14, 51.3, 73.92, 77.26, 77.64, 78.84, 62.14, 68.0, 68.88, 54.15, 64.2], 7: [20.09, 24.4, 23.11, 18.44, 22.35, 23.68, 25.21, 22.46, 24.8, 25.37, 32.49, 29.36, 38.07, 171.21, 224.31, 180.51, 98.98, 59.19, 80.55, 149.98, 218.6, 250.34, 377.06, 876.17, 1206.71, 937.76, 896.45, 7745.0, 35907.48, 53134.7, 47135.25, 65942.37, 49118.1, 25697.52, 10723.9, 5393.01, 3770.78, 2798.8, 2195.5, 1667.8, 1339.85, 1031.72, 746.05, 579.24, 497.49, 422.09, 393.13, 346.77, 226.95, 164.61, 132.81, 127.1, 92.45, 70.62, 56.53, 52.64, 42.61, 50.05, 44.57, 35.36, 34.03, 43.02, 47.37, 57.44, 35.01, 34.3, 30.36, 40.35, 33.84, 25.6, 35.37, 35.41, 32.49, 32.1, 33.1, 30.68, 26.06, 38.28, 32.67, 25.46, 33.01, 27.46, 30.92, 31.58, 35.41, 43.34, 34.43, 33.0, 27.33, 33.75, 30.74, 28.0, 32.99, 30.41, 26.2, 32.26, 29.48, 22.93, 18.1, 23.6, 31.93, 25.77, 22.93, 19.6, 22.72, 20.52, 23.04, 21.81, 25.64, 24.72, 16.45, 19.55, 24.92, 32.92, 16.05, 19.71, 22.98, 20.71, 24.71, 22.62, 21.14, 18.22, 18.92, 22.73, 21.66, 23.61, 25.98, 21.24], 8: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 9: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}  # noqa: E501


# type: ignore
TOF_BASELINE_Z = {0: [16.47, 15.57, 16.19, 22.18, 18.1, 18.37, 10.65, 15.62, 17.08, 22.12, 136.01, 1816.46, 11701.91, 70908.31, 95569.97, 62251.84, 58416.22, 33922.11, 15752.59, 10898.33, 9406.36, 8429.73, 7382.16, 6666.06, 5923.39, 5128.85, 4784.53, 4213.25, 3971.26, 3463.59, 3216.86, 2826.11, 2538.61, 2345.93, 2171.77, 2135.99, 1867.75, 1736.75, 1584.8, 1536.55, 1389.53, 1366.44, 1276.67, 1168.38, 1125.26, 1098.52, 1005.56, 960.52, 991.16, 937.62, 883.15, 788.36, 793.8, 758.26, 742.85, 646.03, 671.63, 599.62, 641.84, 547.33, 555.86, 534.64, 486.41, 470.05, 446.74, 426.64, 433.01, 407.19, 406.59, 437.59, 400.28, 354.65, 396.12, 367.58, 363.75, 333.09, 293.19, 284.41, 285.43, 295.86, 266.04, 285.86, 257.05, 230.35, 278.62, 226.97, 237.89, 213.99, 219.9, 213.3, 189.17, 178.14, 185.53, 189.8, 162.39, 177.64, 158.96, 163.33, 173.11, 160.92, 129.32, 127.93, 125.25, 128.76, 135.53, 122.37, 120.74, 110.52, 90.92, 101.12, 108.53, 90.17, 98.35, 104.06, 98.06, 88.31, 93.47, 80.28, 76.71, 79.27, 80.59, 65.67, 75.05, 60.47, 57.2, 60.62, 70.05, 56.51], 1: [81.83, 77.65, 93.27, 89.8, 80.25, 83.65, 78.76, 70.48, 98.85, 97.4, 90.52, 112.09, 276.78, 335.14, 417.38, 312.04, 159.23, 110.28, 102.08, 84.22, 124.39, 147.63, 152.6, 154.96, 171.12, 173.63, 198.13, 210.35, 245.35, 267.54, 307.4, 336.33, 428.21, 515.67, 615.19, 653.23, 665.33, 685.95, 681.21, 628.72, 581.97, 545.93, 468.51, 426.94, 379.57, 313.96, 283.26, 255.33, 210.0, 197.4, 208.42, 177.64, 165.27, 160.01, 163.92, 964.43, 3481.48, 3498.55, 3207.32, 2209.64, 1193.35, 576.47, 365.76, 256.08, 3048.12, 38399.65, 72076.97, 70116.31, 64927.36, 55090.04, 33974.33, 16787.96, 7706.39, 4249.84, 2895.9, 1964.03, 1349.05, 1063.89, 878.23, 715.81, 588.22, 463.45, 343.67, 262.44, 209.48, 168.69, 166.91, 159.14, 115.38, 108.75, 109.46, 88.56, 114.51, 96.95, 97.96, 87.99, 68.17, 99.87, 68.8, 87.34, 87.54, 74.17, 106.7, 84.5, 82.27, 76.24, 95.98, 88.29, 71.87, 85.8, 82.81, 83.92, 75.04, 94.05, 94.92, 76.0, 89.75, 100.84, 98.38, 103.27, 119.29, 119.71, 100.71, 116.27, 96.11, 83.8, 95.72, 70.46], 2: [103.83, 112.09, 118.59, 104.04, 102.85, 101.81, 88.82, 90.08, 94.86, 126.15, 127.95, 164.7, 780.99, 1201.7, 1278.78, 916.2, 471.93, 243.53, 172.61, 209.47, 333.15, 490.94, 751.5, 1204.27, 1888.13, 3082.37, 3699.21, 3776.26, 3035.6, 3238.26, 3783.78, 3914.77, 3850.84, 3639.81, 3336.55, 2820.95, 2297.98, 1845.46, 1550.8, 1388.91, 1310.16, 1161.02, 1027.76, 1051.88, 908.99, 844.84, 767.39, 656.42, 631.41, 523.45, 543.7, 473.63, 471.36, 440.29, 463.0, 634.56, 1684.23, 2393.76, 1790.26, 1559.74, 2048.29, 1823.99, 1162.96, 702.65, 4535.4, 25090.22, 63798.06, 76797.54, 56442.61, 50719.97, 59263.78, 59828.88, 39734.07, 21613.42, 10413.89, 6045.07, 3913.53, 2857.68, 2192.87, 1719.67, 1495.12, 1285.08, 972.8, 732.81, 582.24, 458.99, 358.8, 326.17, 268.82, 223.79, 192.46, 197.4, 187.79, 156.26, 153.69, 118.76, 134.55, 111.86, 127.75, 95.36, 109.05, 104.75, 109.66, 121.16, 126.46, 135.58, 110.18, 108.8, 111.28, 119.28, 92.4, 107.23, 117.84, 101.2, 102.3, 105.53, 100.41, 92.16, 118.89, 112.56, 145.89, 130.57, 122.53, 114.25, 145.62, 147.42, 129.29, 114.33], 3: [191.66, 194.9, 166.71, 192.73, 171.17, 199.03, 168.21, 187.15, 181.63, 180.69, 253.37, 195.54, 1142.95, 2434.25, 2838.83, 2115.23, 1120.55, 511.01, 450.6, 604.0, 1128.74, 2895.56, 5495.61, 6012.89, 7417.15, 10628.58, 11478.95, 9295.79, 7036.94, 4785.84, 3339.02, 3061.32, 2753.96, 2657.88, 2305.39, 2158.11, 1929.48, 1684.03, 1764.24, 1596.21, 1559.67, 1378.98, 1407.45, 1247.06, 1152.13, 1087.04, 942.77, 926.46, 893.7, 853.13, 879.67, 870.17, 662.84, 1073.84, 1389.99, 1176.65, 875.32, 905.51, 876.84, 913.94, 1150.03, 1140.35, 738.02, 622.57, 2399.18, 16137.18, 33848.69, 43192.85, 32342.9, 27115.22, 39777.65, 37564.4, 24415.31, 13456.93, 7412.53, 4485.61, 2978.49, 2112.64, 1579.5, 1353.25, 1113.64, 926.1, 740.38, 630.44, 505.37, 378.81, 296.34, 231.42, 194.11, 182.42, 188.59, 189.23, 198.64, 180.79, 189.87, 182.03, 175.22, 203.11, 187.32, 209.14, 183.86, 198.16, 183.24, 182.96, 209.12, 203.68, 178.6, 185.72, 200.46, 202.35, 179.18, 180.62, 175.62, 191.85, 196.45, 171.21, 184.1, 195.31, 189.17, 205.61, 211.87, 196.42, 195.44, 209.64, 187.45, 182.96, 196.22, 219.18], 4: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 5: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 6: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 7: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 8: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 9: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}  # noqa: E501
# fmt: on

STACKER_TOF_BASELINE = {
    TOFSensor.X: TOF_BASELINE_X,
    TOFSensor.Z: TOF_BASELINE_Z,
}


def generate_tof_baseline(
    histograms: List[Dict[int, List[int]]], deviation: int = 6
) -> Dict[int, List[float]]:
    """Generate a TOF sensor baseline given multiple histogram readings.

    Baseline must be robust against variation the "no labware" reading of ANY
    stacker should always be below the "baseline". For each bin, we calculate
    the Mean and Standard Deviation (STD) of the samples. We then create the
    "baseline": Baseline = Mean + deviation x Standard Deviation

    @param histogram: a list of tof histogram measurements denoted as dicts of zone to bins.
    @param std: the standard deviation to use when calculating baseline, defaults to 6.
    @return: The baseline measurement.
    """
    assert len(histograms) > 1, "Need at least 2 histograms to generate a baseline."
    baseline = defaultdict(list)
    aggregate = defaultdict(lambda: defaultdict(list))  # type: ignore
    # Iterate through the histograms and create a map of zones to bin value
    # per index of each histogram.
    for histogram in zip(*(h.items() for h in histograms)):
        for zone, bins in histogram:
            assert (
                len(bins) == NUMBER_OF_BINS
            ), f"Invalid number of bins in zone {zone}, got {len(bins)} expected: {NUMBER_OF_BINS}."
            for bin, value in enumerate(bins):
                aggregate[zone][bin].append(value)

    # Iterate through the per-index bin map and calculate the threshold
    # for that specific bin.
    for zone, bins in aggregate.items():
        for bin in bins.values():
            mean = sum(bin) / len(bin)  # type: ignore
            std = statistics.pstdev(bin)  # type: ignore
            threshold = float("%.2f" % (mean + (std * deviation)))
            baseline[zone].append(threshold)
    assert (
        len(baseline) == NUMBER_OF_ZONES
    ), f"Invalid number of zones, got {len(baseline)} expected {NUMBER_OF_ZONES}"
    return dict(baseline)


def labware_detected(
    histogram: Dict[int, List[int]],
    sensor: TOFSensor,
    bins: List[int],
    zones: List[int],
) -> Dict[int, List[int]]:
    """Detect labware by subtracting baseline from histogram."""
    print(f"Detect labware: {sensor}")
    baseline: Dict[int, List[float]] = STACKER_TOF_BASELINE[sensor]
    diff = defaultdict(list)
    if sensor == TOFSensor.Z:
        for zone in zones:
            if zone not in [1]:
                continue
            raw_data = histogram[zone]
            baseline_data = baseline[zone]
            for bin in bins:
                if bin not in range(50, 56):
                    continue
                # We need to ignore raw photon count below 10000 on the X as
                # it becomes inconsistent to detect labware on the home position.
                if raw_data[bin] < 10000:
                    continue
                delta = raw_data[bin] - baseline_data[bin]
                if delta > 0:
                    print(
                        f"detected: zn: {zone} bn: {bin} count: {raw_data[bin]} dt: {delta}"
                    )
                    diff[zone].append(delta)
    elif sensor == TOFSensor.X:
        for zone in zones:
            # We only care about these zones because the X sensor is angled and
            # most of the zones are always detecting obsticles.
            if zone not in [5, 6, 7]:
                continue
            raw_data = histogram[zone]
            baseline_data = baseline[zone]
            for bin in bins:
                if bin not in range(10, 20):
                    continue
                # We need to ignore raw photon count below 10000 on the X as
                # it becomes inconsistent to detect labware on the home position.
                if raw_data[bin] < 10000:
                    continue
                delta = raw_data[bin] - baseline_data[bin]
                if delta > 0:
                    print(
                        f"detected: zn: {zone} bn: {bin} count: {raw_data[bin]} dt: {delta}"
                    )
                    diff[zone].append(delta)
    return dict(diff)  # type: ignore
