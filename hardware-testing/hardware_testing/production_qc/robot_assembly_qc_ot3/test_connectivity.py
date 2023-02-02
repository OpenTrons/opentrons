"""Test Connectivity."""
import asyncio
from typing import List, Union, Optional

from opentrons.drivers.rpi_drivers.usb import USBBus
from opentrons.hardware_control.ot3api import OT3API
from opentrons.system import nmcli

from hardware_testing.data.csv_report import (
    CSVReport,
    CSVResult,
    CSVLine,
    CSVLineRepeating,
)


USB_WAIT_TIMEOUT_SECONDS = 10
USB_READ_BUS_LENGTH_NO_CONNECTION = 4
USB_PORTS_TO_TEST = [
    "usb-a-front",
    "usb-a-right-1",
    "usb-a-right-2",
    "usb-a-right-3",
    "usb-a-right-4",
    "usb-a-left-1",
    "usb-a-left-2",
    "usb-a-left-3",
    "usb-a-left-4",
]
# TODO: work with EEs to get Aux-Port tests implemented
AUX_PORT_TESTS = [
    "aux-left-can",
    "aux-left-door-switch",
    "aux-right-can",
    "aux-right-door-switch",
]

ALLOWED_SECURITY_TYPES = {
    nmcli.SECURITY_TYPES.NONE.value: nmcli.SECURITY_TYPES.NONE,
    nmcli.SECURITY_TYPES.WPA_EAP.value: nmcli.SECURITY_TYPES.WPA_EAP,
    nmcli.SECURITY_TYPES.WPA_PSK.value: nmcli.SECURITY_TYPES.WPA_PSK,
}


def _count_usb_listings(api: OT3API) -> int:
    board_rev = api._backend.board_revision
    ports = USBBus(board_rev)._read_bus()
    ports_len = len(ports)
    return max(ports_len - USB_READ_BUS_LENGTH_NO_CONNECTION, 0)


async def _test_ethernet(api: OT3API, report: CSVReport, section: str) -> None:
    if not api.is_simulator:
        input("connect ethernet, then press ENTER:")
        ethernet_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.ETH_LL)
        # {
        #   'ipAddress': '192.168.1.105/24',
        #   'macAddress': '00:14:2D:69:43:79',
        #   'gatewayAddress': '192.168.1.1',
        #   'state': 'connected',
        #   'type': 'ethernet'
        # }
        eth_ip = ethernet_status["ipAddress"]
    else:
        eth_ip = "0.0.0.0"
    result = CSVResult.from_bool(bool(eth_ip))
    print(f"ethernet IP: {eth_ip} - {result}")
    report(section, "ethernet", [eth_ip, result])


async def _test_wifi(report: CSVReport, section: str) -> None:
    ssid = ""
    password: Optional[str] = None
    result = CSVResult.FAIL

    def _finish() -> None:
        print(f"wifi connected: {result}")
        report(section, "wifi", [ssid, password, wifi_ip, result])

    wifi_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.WIFI)
    wifi_ip = wifi_status["ipAddress"]
    if wifi_ip:
        result = CSVResult.PASS
        return _finish()

    print("scanning wifi networks...")
    ssids = await nmcli.available_ssids()
    if not ssids:
        print("no ssids found")
        return _finish()
    checked_ssids = [
        s for s in ssids if s["securityType"] in list(ALLOWED_SECURITY_TYPES.keys())
    ]
    if not checked_ssids:
        print("no ssids found with compatible security types")
        return _finish()
    # get just the first x10 names, removing repetitions
    ssid_names_list: List[str] = list()
    for s in checked_ssids:
        if s["ssid"] not in ssid_names_list:
            ssid_names_list.append(s["ssid"])
    print("found wifi networks:")
    for i, n in enumerate(ssid_names_list[:10]):
        print(f"\t{i + 1}: {n}")
    res = input("select wifi number: ")
    try:
        ssid = ssid_names_list[int(res) - 1]
        print(f'"{ssid}"')
    except (ValueError, KeyError) as e:
        print(e)
        _finish()
    found_ssids = [s for s in ssids if ssid == s["ssid"]]
    ssid_info = found_ssids[0]
    sec = ALLOWED_SECURITY_TYPES[ssid_info["securityType"]]
    if sec != nmcli.SECURITY_TYPES.NONE:
        password = input("enter wifi password: ")
    try:
        print("connecting...")
        await nmcli.configure(ssid, sec, psk=password)
    except ValueError as e:
        print(e)
        return _finish()
    wifi_status = await nmcli.iface_info(nmcli.NETWORK_IFACES.WIFI)
    wifi_ip = wifi_status["ipAddress"]
    result = CSVResult.from_bool(bool(wifi_ip))
    return _finish()


async def _test_usb_a_ports(api: OT3API, report: CSVReport, section: str) -> None:
    async def _is_usb_device_connected(wait: bool = False) -> bool:
        if api.is_simulator:
            return True
        for _ in range(USB_WAIT_TIMEOUT_SECONDS):
            if wait:
                await asyncio.sleep(1)
            if _count_usb_listings(api) > 0:
                return True
        return False

    skip = False
    if not api.is_simulator:
        inp = input('prepare to test USB, press ENTER when ready ("skip" to skip): ')
        skip = "skip" in inp
    if not skip:
        for tag in USB_PORTS_TO_TEST:
            while not api.is_simulator and await _is_usb_device_connected():
                input("unplug all USB devices, press ENTER when ready")
            if not api.is_simulator:
                input(f"[{tag}] connect a USB device, press ENTER when ready)")
            result = CSVResult.from_bool(await _is_usb_device_connected(wait=True))
            print(f"{tag}: {result}")
            report(section, tag, [result])


async def _test_aux(api: OT3API, report: CSVReport, section: str) -> None:
    # TODO: work with EEs to get Aux-Port tests implemented
    #       - can analyzer
    #       - door switch detection
    for test_name in AUX_PORT_TESTS:
        result = CSVResult.FAIL
        if not api.is_simulator:
            input(f"testing {test_name.upper()}, press ENTER when ready")
        if "can" in test_name:
            # send some arbitrary CAN data, to inspect externally
            await api.refresh_current_position_ot3()
        if not api.is_simulator:
            inp = input(f"does {test_name.upper()} signal look good? (y/n): ")
            result = CSVResult.from_bool("y" in inp)
        print(f"{test_name}: {result}")
        report(section, test_name, [result])


def build_csv_lines() -> List[Union[CSVLine, CSVLineRepeating]]:
    """Build CSV Lines."""
    usb_a_tests = [CSVLine(t, [CSVResult]) for t in USB_PORTS_TO_TEST]
    aux_tests = [CSVLine(t, [CSVResult]) for t in AUX_PORT_TESTS]
    other_tests = [
        CSVLine("ethernet", [str, CSVResult]),
        CSVLine("wifi", [str, str, str, CSVResult]),
        CSVLine("usb-b-rear", [CSVResult]),
    ]
    return other_tests + usb_a_tests + aux_tests  # type: ignore[return-value]


async def run(api: OT3API, report: CSVReport, section: str) -> None:
    """Run."""
    # ETHERNET
    await _test_ethernet(api, report, section)

    # WIFI
    if not api.is_simulator:
        await _test_wifi(report, section)
    else:
        report(section, "wifi", ["", "", "0.0.0.0", CSVResult.PASS])
        assert nmcli.iface_info
        assert nmcli.configure
        assert nmcli.wifi_disconnect

    # USB-B-REAR
    if not api.is_simulator:
        usb_b_res = input(
            "Connect USB-B to computer. Does computer detect device? (y/n): "
        )
        result = CSVResult.from_bool("y" in usb_b_res.lower())
    else:
        result = CSVResult.PASS
    print(f"rear USB-B: {result}")
    report(section, "usb-b-rear", [result])

    # USB-A
    await _test_usb_a_ports(api, report, section)

    # AUX
    await _test_aux(api, report, section)
