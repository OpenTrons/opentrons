import sys
import serial
import serial.tools.list_ports
import time

EXPECTED_LOCATION = "1-1.2"# If connected to rear panel board J12, location will be "1-1.2"
CAMERA_COMMAND = "OFFLINE\n"
EXPECTED_RESPONSE = b'!OK' # Response to 'OFFLINE' Command

# Connect to internal USB serial port attached to rear panel board J12
barcode_scanner_port = None 
ports = serial.tools.list_ports.comports()
for port, desc, hwid in ports:
    #print(f"{port}: {desc} [{hwid}]")
    location = hwid.split("LOCATION=",1)[1]
    if location == EXPECTED_LOCATION:
        print (f"Found {desc} at {port}.")
        barcode_scanner_port = port
        serialPort = serial.Serial(barcode_scanner_port, timeout=2, write_timeout = 2)
        
        try:
            serialPort.baudrate = 115200
        except UnboundLocalError as e:
            raise Exception(f"No USB serial adapter found, Error: {e}")
        
        serialPort.close()
        serialPort.open()

if not serialPort:
    print("No USB serial adapter found!!!")
else:
    # Check camera communication
    serialPort.reset_input_buffer()
    x = serialPort.write(CAMERA_COMMAND.encode())
    s = serialPort.read(10000)
    #print(s)
    if (s == EXPECTED_RESPONSE):
        print("Camera communication successful.")
    else:
        print("CAMERA COMMUNICATION FAILED!!!")

serialPort.close()