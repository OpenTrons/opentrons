import sys
from serial import Serial
import serial.tools.list_ports
import asyncio
from typing import Optional


EXPECTED_LOCATION = "1-1.2" # If connected to rear panel board J12, location will be "1-1.2"
CAMERA_COMMAND = "OFFLINE\n"
EXPECTED_RESPONSE = '!OK' # Response to 'OFFLINE' Command
CAM_BAUDRATE = 115200
CAM_TIMEOUT = 1

def scan_ports():
    """Scan for available ports and return the port of the barcode scanner."""
    barcode_scanner_port = None 
    ports = serial.tools.list_ports.comports()
    for port, desc, hwid in ports:
        print(f"{port}: {desc} [{hwid}]")
        location = hwid.split("LOCATION=",1)[1]
        if location == EXPECTED_LOCATION:
            print (f"Found {desc} at {port}.")
            barcode_scanner_port = port
    return barcode_scanner_port

class OmronMircoscanCamera:
    """""Class to control Omron Microscan Camera."""
    def __init__(self, connection: Serial):
        self.serialPort = connection
        self.is_connected = False

    @classmethod
    async def create(cls, port: str, loop: Optional[asyncio.AbstractEventLoop]) -> "OmronMircoscanCamera":
        """Create a Mark10 driver."""
        conn = Serial(port=port, baudrate=CAM_BAUDRATE, timeout=CAM_TIMEOUT)
        return OmronMircoscanCamera(connection=conn)
                
    async def connect(self):
        """Connect to the camera."""
        try:
            await self.serialPort.open()
            if not self.serialPort.is_open:
                raise Exception("Unable to connect to camera.")
            self.is_connected = True
            print(f"Connected to {self.port}")
        except Exception as e:
            print(f"Error connecting to {self.port}: {e}")
            self.is_connected = False
            raise Exception(f"Error connecting to {self.port}: {e}")
    
    async def disconnect(self):
        """Disconnect from the camera."""
        if self.is_connected:
            self.serialPort.close()
            self.is_connected = False
            print(f"Disconnected from {self.port}")
        else:
            print("Not connected to camera.")

    async def _write(self, data: bytes) -> None:
        """Non-blocking write operation."""
        try:
            # Offload write to another thread to avoid blocking the event loop
            await asyncio.to_thread(self.serialPort.write, data)
        except Exception as e:
            raise Exception("Unable to write to device.")
        
    async def _readline(self) -> str:
        """Non-blocking read operation."""
        try:
            # Offload readline to another thread to avoid blocking the event loop
            return await asyncio.to_thread(self.serialPort.readline)
        except Exception as e:
            raise Exception("Unable to read from force gauge")

    async def check_camera_communication(self):
        """Check camera communication."""
        self.serialPort.reset_input_buffer()
        x = await self._write(CAMERA_COMMAND.encode())
        # x = self.serialPort.write(CAMERA_COMMAND.encode())
        s = await self._readline()
        s = s.decode('utf-8')
        # s = self.serialPort.read_until().decode('utf-8')
        print(f'Camera signal: {s}')
        if (s == EXPECTED_RESPONSE):
            print("Camera communication successful.")
        else:
            print("CAMERA COMMUNICATION FAILED!!!")
            self.serialPort.close()
            raise Exception("Camera communication failed.")
        return s
    
if __name__ == '__main__':
    cam_port = scan_ports()
    camera = OmronMircoscanCamera(port=cam_port)
    try:
        asyncio.run(camera.connect())
        asyncio.run(camera.check_camera_communication())
        asyncio.run(camera.disconnect())
    except Exception as e:
        print(f"Error: {e}")
