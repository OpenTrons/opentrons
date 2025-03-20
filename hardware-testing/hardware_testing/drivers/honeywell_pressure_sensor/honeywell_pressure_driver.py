import asyncio
import logging
import serial
import time
import csv

logger = logging.getLogger(__name__)

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "basic": {"format": "%(asctime)s %(name)s %(levelname)s %(message)s"}
    },
    "handlers": {
        "file_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "basic",
            "filename": "/data/stallguard/stallguard_test.log",
            "maxBytes": 5000000,
            "level": logging.INFO,
            "backupCount": 3,
        },
    },
    "loggers": {
        "": {
            "handlers": ["file_handler"],
            "level": logging.INFO,
        },
    },
}

# logging.config.dictConfig(LOG_CONFIG)

class HoneywellPressureError(Exception):
    """Exception for Honeywell pressure sensor errors."""
    pass

class HoneywellPressureProtocolError(Exception):
    """Exception for Honeywell pressure sensor protocol errors."""
    pass

class HoneywellPressureDriver:
    """Driver for Honeywell pressure sensor."""
    def __init__(self, port):
        self.port = port
        self.is_connected = False
        self.is_reading = False
        self.pressure = 0.0
        self.zero_guage_reading = 0.0

    async def connect(self):
        """Connect to the sensor."""
        try:
            self.sensor = serial.Serial(port=self.port, baudrate=9600)
            self.is_connected = True
            logging.info(f"Connected to {self.port}")
        except Exception as e:
            logging.error(f"Error connecting to {self.port}: {e}")
            self.is_connected = False
            raise HoneywellPressureError(f"Error connecting to {self.port}: {e}")

    async def disconnect(self):
        """Disconnect from the sensor."""
        if self.is_connected:
            self.sensor.close()
            self.is_connected = False
            logging.info(f"Disconnected from {self.port}")
        else:
            logging.error("Not connected to sensor.")

    async def start_reading(self):
        """Start reading data from the sensor."""
        if not self.is_connected:
            logging.error("Not connected to sensor.")
        if self.is_connected:
            self.is_reading = True
            while self.is_reading:
                try:
                    data = self.sensor.readline().decode('utf-8').strip().split(',')
                    logging.debug(f"Raw data: {data}")
                    if len(data) >= 4:
                        self.pressure = float(data[4])
                        return (self.pressure - self.zero_guage_reading )
                    else:
                        logging.warning(f"Unexpected data format: {data}")
                except Exception as e:
                    logging.error(f"Error reading data: {e}")
                    raise HoneywellPressureError("Error reading data from sensor.")
        else:
            logging.error("Not connected to sensor.")
            raise HoneywellPressureError("Not connected to sensor.")

    async def stop_reading(self):
        self.is_reading = False
        logging.info("Stopped reading from sensor.")
        
    async def zero_gauge(self, samples: int = 200):
        """Zero the gauge."""
        values = []
        for x in range(samples):
            pressure_reading = await self.start_reading()
            values.append(pressure_reading)
        self.zero_guage_reading = sum(values) / len(values)
        print(f'gauge_zero: {self.zero_guage_reading}')
        
# Example usage
async def main():
    task_1 = asyncio.create_task(pressure_sensor_func())
    task_2 = asyncio.create_task(stop_reading())
    try:
        await asyncio.gather(task_1, task_2)
    except Exception as e:
        logging.error(f"Error in main: {e}")

async def pressure_sensor_func():
    driver = HoneywellPressureDriver('COM13')
    await driver.connect()
    await driver.zero_gauge()
    p_time = time.time()
    global pipette_action
    pipette_action = True
    with open('pressure_data.csv', 'w', newline='') as csvfile:
        test_data = {'Time(s)': None, 'Pressure(Pa)': None,'State':None, 'Error': None}
        writer = csv.DictWriter(csvfile, test_data)
        writer.writeheader()
        try:
            while pipette_action:
                pressure = await driver.start_reading()
                test_data['Time(s)'] = (time.time() - p_time)
                test_data['Pressure(Pa)'] = pressure
                test_data['State'] = 'Pipetting'
                writer.writerow({'Time(s)': time.time() - p_time, 
                                'Pressure(Pa)': pressure})
                print(test_data)
                csvfile.flush()
        except Exception as e:
            # writer['Error'] = str(e)
            # csvfile.flush()
            raise Exception(f"Error in pressure sensor function: {e}")

if __name__ == '__main__':
    global pipette_action
    asyncio.run(main())
    pipette_action = False

