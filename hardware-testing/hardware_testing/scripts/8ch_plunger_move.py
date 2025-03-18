"""Pipette Plunger Move Up and Down Test."""
import argparse
import asyncio
import csv
from datetime import datetime

from opentrons.hardware_control.ot3api import OT3API
from opentrons.config.defaults_ot3 import (
    DEFAULT_RUN_CURRENT,
    DEFAULT_MAX_SPEEDS,
    DEFAULT_ACCELERATIONS,
)
from opentrons_shared_data.errors.exceptions import StallOrCollisionDetectedError

from hardware_testing.opentrons_api import types
from hardware_testing.opentrons_api import helpers_ot3

# 默认参数设置
DEFAULT_TRIALS = 65000
DEFAULT_ACCELERATION = DEFAULT_ACCELERATIONS.low_throughput[types.OT3AxisKind.P]
DEFAULT_CURRENT = DEFAULT_RUN_CURRENT.low_throughput[types.OT3AxisKind.P]
DEFAULT_SPEED = DEFAULT_MAX_SPEEDS.low_throughput[types.OT3AxisKind.P]

print(f"Default_Settings: Current={DEFAULT_CURRENT}, Speed={DEFAULT_SPEED}, Acceleration={DEFAULT_ACCELERATION}")

async def home_plunger(api: OT3API, mount: types.OT3Mount) -> None:
    # 复位柱塞
    pipette_ax = types.Axis.of_main_tool_actuator(mount)
    await api.home([pipette_ax])

async def move_plunger(api: OT3API, mount: types.OT3Mount, trials: int) -> None:
    # 获取柱塞位置范围
    plunger_poses = helpers_ot3.get_plunger_positions_ot3(api, mount)
    top_pos, _, bottom_pos, _ = plunger_poses
    
    # 创建CSV文件记录移动数据
    csv_filename = f"plunger_movement_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(csv_filename, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(['Trial', 'Timestamp', 'Movement', 'Status', 'Error_Type', 'Error_Details'])
        
        for i in range(trials):
            print(f"Trial {i+1}/{trials}")
            
            # 向下移动
            print("Moving down...")
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            try:
                # 每次移动前重新设置运动参数
                pipette_ax = types.Axis.of_main_tool_actuator(mount)
                print(f"Moving to bottom plunger position: {bottom_pos-20}\n")
                await helpers_ot3.move_plunger_absolute_ot3(api, mount, bottom_pos-20)
                csvwriter.writerow([i+1, current_time, 'Down', 'Success', '', ''])
            except StallOrCollisionDetectedError as e:
                error_msg = f"Collision detected during downward movement: {str(e)}"
                print(error_msg)
                csvwriter.writerow([i+1, current_time, 'Down', 'Failed', 'Collision', error_msg])
                # 尝试恢复到安全位置
                try:
                    await helpers_ot3.move_plunger_absolute_ot3(api, mount, top_pos+3)
                except Exception:
                    print("Failed to recover to safe position")
                continue
            except Exception as e:
                error_msg = f"Unexpected error during downward movement: {str(e)}"
                print(error_msg)
                csvwriter.writerow([i+1, current_time, 'Down', 'Failed', 'Other', error_msg])
                continue
            
            await asyncio.sleep(1.5)  # 增加移动间隔时间
            
            # 向上移动
            print("Moving up...")
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            try:
                # 每次移动前重新设置运动参数
                pipette_ax = types.Axis.of_main_tool_actuator(mount)
                print(f"Moving to top plunger position: {top_pos}\n")
                await helpers_ot3.move_plunger_absolute_ot3(api, mount, top_pos)
                csvwriter.writerow([i+1, current_time, 'Up', 'Success', '', ''])
            except StallOrCollisionDetectedError as e:
                error_msg = f"Collision detected during upward movement: {str(e)}"
                print(error_msg)
                csvwriter.writerow([i+1, current_time, 'Up', 'Failed', 'Collision', error_msg])
                continue
            except Exception as e:
                error_msg = f"Unexpected error during upward movement: {str(e)}"
                print(error_msg)
                csvwriter.writerow([i+1, current_time, 'Up', 'Failed', 'Other', error_msg])
                continue
            
            await asyncio.sleep(1.5)  # 增加移动间隔时间

async def main(is_simulating: bool, trials: int) -> None:
    # 初始化API
    api = await helpers_ot3.build_async_ot3_hardware_api(
        is_simulating=is_simulating,
        pipette_right="p1000_multi_v3.5"
    )
    
    # 设置移动位置
    await api.home()
    mount = types.OT3Mount.LEFT
    
    # 执行柱塞移动
    await home_plunger(api, mount)
    await move_plunger(api, mount, trials)
    print("Test completed!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test plunger movement")
    parser.add_argument("--simulate", action="store_true", help="Run in simulation mode")
    parser.add_argument("--trials", type=int, default=DEFAULT_TRIALS, help="Number of trials")
    args = parser.parse_args()
    
    asyncio.run(main(args.simulate, args.trials))
