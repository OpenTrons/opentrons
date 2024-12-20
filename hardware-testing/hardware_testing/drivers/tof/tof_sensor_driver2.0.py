"""Flex Stacker TOF Sensor Driver."""
import configparser
import os
import sys
import csv
import time
import serial
import argparse
import file_manager
import pandas as pd
import plotly.express as px
import manage_df
from pathlib import Path
import validate_labware
import google_drive_helper
from plotly.subplots import make_subplots
from datetime import datetime

def build_arg_parser():
    arg_parser = argparse.ArgumentParser(description='Opentrons TOF Sensor Driver')
    arg_parser.add_argument('-t', '--test', action="store_true", required=False, help='Gets sample histogram data from the sensor')
    arg_parser.add_argument('-w', '--labware', action="store_true", required=False, help='Measures the sensor for different labware quantity')
    arg_parser.add_argument('-m', '--labware_max', type=int, required=False, help='Sets the maximum number of labware', default=3)
    arg_parser.add_argument('-z', '--zones', nargs="*", type=int, required=False, help='Sets the zone numbers for histogram data (0-9)', default=[1,2,3])
    arg_parser.add_argument('-l', '--log', type=float, required=False, help='Sets the log duration (min)', default=0.1)
    arg_parser.add_argument('-p', '--port_name', type=str, required=False, help='Sets serial connection port, ex: -p COM5')
    arg_parser.add_argument('-a', '--axis_name', type=str, required=False, help='Sets the axis for data verification', default='z')
    arg_parser.add_argument('-s', '--save', type=int, required=False, help='How should results be saved? Octal number 7 to save to drive, locally, and sheets, and 0 to not save', default=0)
    return arg_parser

class TOF_Sensor_Driver():
    def __init__(self, port="/dev/ttyACM0", baudrate=115200):
        self.datetime = datetime.now()
        self.PORT = port
        self.BAUDRATE = baudrate
        self.TIMEOUT = 0.1
        self.ACK = "\n"
        self.GCODE = {
            "HIST_ZONE":"TOF$HZ",
        }
        self.sensor = None
        self.log_file = None
        self.log_folder = "tof_log"
        self.plot_folder = "tof_plots"
        self.hist_header = "#HZ"
        self.LIMIT = 1000
        self.PLOT_HEIGHT = 800
        self.PLOT_WIDTH = 1000
        self.PLOT_FONT = 16
        self.PLOT_FORMAT = ".png"
        self.plot_param = {
            "figure":None,
            "filename":None,
            "title":None,
            "x_title":None,
            "y_title":None,
            "y2_title":None,
            "x_range":None,
            "y_range":None,
            "y2_range":None,
            "legend":None,
            "annotation":None
        }
        self.df_list = []

    def connect(self):
        try:
            self.sensor = serial.Serial(port = self.PORT,
                                        baudrate = self.BAUDRATE,
                                        parity = serial.PARITY_NONE,
                                        stopbits = serial.STOPBITS_ONE,
                                        bytesize = serial.EIGHTBITS,
                                        timeout = self.TIMEOUT)
        except serial.SerialException:
            error = "Unable to access Serial port"
            raise serial.SerialException(error)

    def disconnect(self):
        self.equipment.close()

    def send_packet(self, packet):
        self.sensor.flushInput()
        self.sensor.write(packet.encode("utf-8"))

    def get_packet(self):
        self.sensor.flushOutput()
        packet = self.sensor.readline().decode("utf-8").strip(self.ACK)
        return packet

    def get_histogram_zone(self, zone_list):
        zones = ",".join(map(str, zone_list))
        self.packet = "{},{}{}".format(self.GCODE["HIST_ZONE"], zones, self.ACK)
        self.send_packet(self.packet)
        time.sleep(2.0)
        data_list = []
        for i in range(len(zone_list)):
            reading = True
            while reading:
                data_list.append(self.get_packet())
                if self.hist_header in data_list[i]:
                    reading = False
                    # time.sleep(2.0)
                else:
                    data_list = []
                    self.send_packet(self.packet)
                    time.sleep(2.0)
        print("")
        print(data_list)
        return data_list

    def get_zone(self, histogram):
        zone = histogram.split(":")[0][-1]
        return zone

    def histogram_to_list(self, histogram):
        hist_list = histogram.split(":")[1].split(",")
        return hist_list

    def log_histogram(self, duration, labware = False, labware_num = 0):
        self.create_folder(self.log_folder)
        if labware:
            self.create_file(True, labware_num)
        else:
            self.create_file()
        filename = f"{self.log_folder}/{self.log_file}"
        self.start_time = time.time()
        with open(filename, 'w+') as f:
            writer = csv.writer(f)
            elapsed_time = (time.time() - self.start_time)/60
            while elapsed_time < duration:
                elapsed_time = (time.time() - self.start_time)/60
                hist_list = self.get_histogram_zone(args.zones)
                for hist in hist_list:
                    zone = self.get_zone(hist)
                    bins = self.histogram_to_list(hist)
                    data = [elapsed_time] + [zone] + bins
                    writer.writerow(data)
                    f.flush()
                time.sleep(1.0)
            f.close()
        return filename

    def import_log(self, file):
        df = pd.read_csv(file, header=None)
        df.drop(0, axis=1, inplace=True)
        df = df.T
        zone_list = []
        for col in df.columns:
            zone = df[col].iloc[0]
            zone_list.append(zone)
            sample = zone_list.count(zone)
            df.rename(columns={col:f"Z{zone}-S{sample}"}, inplace=True)
        df = df[1:]
        df.reset_index(drop=True, inplace=True)
        df.name = file
        return df

    def plot_log(self, labware = False, labware_num = 0):
        if labware_num == 0: self.df_list = []
        filename = f"{self.log_folder}/{self.log_file}"
        # filename = f"{self.log_folder}/TOF_ZONE[1,2,3]_10-17-24_17-02.csv"
        self.create_folder(self.plot_folder)
        df = self.import_log(filename)
        cols = sorted(df)
        # print(df)
        # Plot each Zone Sample
        for col in cols:
            zone = col.split("-")[0].replace("Z","")
            sample = col.split("-")[1].replace("S","")
            if labware:
                filename = f"tof_histogram_zone{zone}_sample{sample}_lab{labware_num}"
                title = f"TOF Histogram - Zone {zone} (Sample {sample}) [Labware = {labware_num}]"
            else:
                filename = f"tof_histogram_zone{zone}_sample{sample}"
                title = f"TOF Histogram - Zone {zone} (Sample {sample})"
            fig = px.line(df, y=col)
            self.plot_param["figure"] = fig
            self.plot_param["filename"] = filename
            self.plot_param["title"] = title
            self.plot_param["x_title"] = "Bin Number"
            self.plot_param["y_title"] = "Number of Photons"
            self.plot_param["x_range"] = [0, 127]
            self.plot_param["y_range"] = None
            self.plot_param["legend"] = None
            self.plot_param["annotation"] = None
            self.make_plot(self.plot_param)

        # Plot each Zone Average
        df_avg = df.groupby(by=lambda x: x.split("-")[0], axis=1).mean()
        # print(df_avg)
        cols = sorted(df_avg)
        zone_list = [int(x.replace("Z","")) for x in cols]
        for i, col in enumerate(cols):
            zone = col.replace("Z","")
            if labware:
                filename = f"tof_histogram_zone{zone}_average_lab{labware_num}"
                title = f"TOF Histogram - Zone {zone} (Average) [Labware = {labware_num}]"
                if i==0:
                    self.df_list.append(df_avg)
            else:
                filename = f"tof_histogram_zone{zone}_average"
                title = f"TOF Histogram - Zone {zone} (Average)"
            fig = px.line(df_avg, y=col)
            self.plot_param["figure"] = fig
            self.plot_param["filename"] = filename
            self.plot_param["title"] = title
            self.plot_param["x_title"] = "Bin Number"
            self.plot_param["y_title"] = "Number of Photons"
            self.plot_param["x_range"] = [0, 127]
            self.plot_param["y_range"] = None
            self.plot_param["legend"] = None
            self.plot_param["annotation"] = None
            self.make_plot(self.plot_param)

        # Plot all Zones Average
        if labware:
            filename = f"tof_histogram_zone-all_average_lab{labware_num}"
            title = f"TOF Histogram - Zone All (Average) [Labware = {labware_num}]"
        else:
            filename = f"tof_histogram_zone-all_average"
            title = f"TOF Histogram - Zone All (Average)"
        fig = px.line(df_avg)
        self.plot_param["figure"] = fig
        self.plot_param["filename"] = filename
        self.plot_param["title"] = title
        self.plot_param["x_title"] = "Bin Number"
        self.plot_param["y_title"] = "Number of Photons"
        self.plot_param["x_range"] = [0, 127]
        self.plot_param["y_range"] = None
        self.plot_param["legend"] = "Zones"
        self.plot_param["annotation"] = None
        self.make_plot(self.plot_param)

        if labware_num == args.labware_max:
            for zone in zone_list:
                df_all = pd.DataFrame()
                for i, df in enumerate(self.df_list):
                    df_all[f"Labware{i}"] = df[f"Z{zone}"]
                # print(df_all)
                legend = []
                y_axis = sorted(df_all)
                fig = px.line(df_all, y=y_axis)
                for i in range(len(y_axis)):
                    legend.append(f"Labware = {i}")
                self.set_legend(fig, legend)
                ## Normal Plot
                self.plot_param["figure"] = fig
                self.plot_param["filename"] = f"tof_histogram_zone{zone}_average_lab-all"
                self.plot_param["title"] = f"TOF Histogram - Zone {zone} (All Labware)"
                self.plot_param["x_title"] = "Bin Number"
                self.plot_param["y_title"] = "Number of Photons"
                self.plot_param["x_range"] = [0, 127]
                self.plot_param["y_range"] = None
                self.plot_param["legend"] = "Number of Labware"
                self.plot_param["annotation"] = None
                self.make_plot(self.plot_param)
                ## Zoomed Plot
                self.plot_param["figure"] = fig
                self.plot_param["filename"] = f"tof_histogram_zone{zone}_average_lab-all_zoomed"
                self.plot_param["title"] = f"TOF Histogram - Zone {zone} (All Labware) [Zoomed]"
                self.plot_param["x_title"] = "Bin Number"
                self.plot_param["y_title"] = "Number of Photons"
                self.plot_param["x_range"] = [20, 80]
                self.plot_param["y_range"] = None
                self.plot_param["legend"] = "Number of Labware"
                self.plot_param["annotation"] = None
                self.make_plot(self.plot_param)

    def set_legend(self, figure, legend):
        for idx, name in enumerate(legend):
            figure.data[idx].name = name
            figure.data[idx].hovertemplate = name

    def set_annotation(self, x_pos, y_pos, text, ax_pos=0, ay_pos=0, y_ref="y1"):
        annotation = {
            "x":x_pos,
            "y":y_pos,
            "ax":ax_pos,
            "ay":ay_pos,
            "xref":"x1",
            "yref":y_ref,
            "text":text,
            "showarrow":True,
            "arrowhead":3,
            "arrowsize":2,
            "font":{"size":20,"color":"black"},
            "bordercolor":"black",
            "bgcolor":"white"
        }
        return annotation

    def make_plot(self, param):
        fig = param["figure"]
        fig.update_xaxes(minor_showgrid=True)
        fig.update_yaxes(minor_showgrid=True)
        fig.update_layout(
            font_size=self.PLOT_FONT,
            height=self.PLOT_HEIGHT,
            width=self.PLOT_WIDTH,
            title=param["title"],
            xaxis_title=param["x_title"],
            yaxis_title=param["y_title"],
            xaxis_range=param["x_range"],
            yaxis_range=param["y_range"],
            xaxis_showgrid=True,
            yaxis_showgrid=True,
            xaxis_linecolor="black",
            yaxis_linecolor="black",
            xaxis_ticks="outside",
            yaxis_ticks="outside",
            legend_title=param["legend"],
            annotations=param["annotation"]
        )
        if param["y2_title"] is not None:
            fig.update_layout(yaxis2_title=param["y2_title"], yaxis2_range=param["y2_range"])

        img_name = param["filename"] + self.PLOT_FORMAT
        img_path = os.path.join(self.plot_folder, img_name)
        fig.write_image(img_path)

        for key, value in self.plot_param.items():
            self.plot_param[key] = None

    def create_folder(self, folder):
        if not os.path.exists(folder):
            os.makedirs(folder)

    def create_file(self, labware = False, labware_num = 0):
        current_datetime = self.datetime.strftime("%m-%d-%y_%H-%M")
        if labware:
            filename = f"TOF_ZONE{args.zones}_LAB{labware_num}_{current_datetime}.csv".replace(" ","")
        else:
            filename = f"TOF_ZONE{args.zones}_{current_datetime}.csv".replace(" ","")
        self.log_file = filename
        print(f"File Name: {self.log_file}")

def get_drive_details() -> list:
    configurations = None
    configs_file = None
    while not configs_file:
        configs_file = input("Please enter path to config.ini: ")
        if os.path.exists(configs_file):
            break
        else:
            configs_file = None
            print("Please enter a valid path")
    try:
        configurations = configparser.ConfigParser()
        configurations.read(configs_file)
    except configparser.ParsingError as e:
        print("Cannot read configuration file\n" + str(e))
    if configurations:
        drive_folder = configurations['Drive']['folder']
        email = configurations['Drive']['email']
        sheet = configurations['Drive']['sheet']
        robot = configurations['Robot']['name']
        z_serial = configurations['Z']['serial']
        z_cover = configurations['Z']['cover']
        x_serial = configurations['X']['serial']
        x_cover = configurations['X']['cover']
        labware_name = configurations['Labware']['name']
        num_labware = int(configurations['Labware']['samples'])
        test = configurations['Test']['test']
        return ([drive_folder,
                email,
                robot,
                z_serial,
                z_cover,
                x_serial,
                x_cover,
                'Labware Data',
                labware_name,
                test,
                num_labware,
                ], sheet)
    
def oct_to_bin(octal_num):
    if octal_num > 7:
        print(f'{octal_num} is invalid')
        sys.exit(1)
    bin_num = bin(octal_num)[2:]
    prepend = (3 - len(bin_num)) * '0'
    return(prepend + bin_num)

if __name__ == '__main__':
    print("TOF Sensor Driver")
    arg_parser = build_arg_parser()
    args = arg_parser.parse_args()
    drive_details, sheet = get_drive_details()

    save_settings = oct_to_bin(args.save)
    print(save_settings)
    save_to_drive = int(save_settings[0]) == 1
    save_local = int(save_settings[1]) == 1
    save_to_sheets = int(save_settings[2]) == 1
    
    if args.axis_name == 'z':
        axis = 'Z-Axis'
    elif args.axis_name == 'x':
        axis = 'X-Axis'

    if args.port_name:
        sensor = TOF_Sensor_Driver(port=args.port_name, baudrate=115200)
    else:
        sensor = TOF_Sensor_Driver(port="/dev/ttyACM0", baudrate=115200)
    sensor.connect()


    # TODO: Get Serial of board from flex stacker itself
    if args.test:
        sensor.log_histogram(args.log)
        sensor.plot_log()
    elif args.labware:
        num_labware = drive_details[len(drive_details)-1]
        for labware in range(num_labware):
            print(f"Testing TOF Sensor from 0 to {args.labware_max} labware.\n")
            for i in range(args.labware_max + 1):
                input(f"\nMeasure for Labware = {i} [Press ENTER to continue]")
                data_path = sensor.log_histogram(args.log, True, i)
                print(data_path)
                sensor.plot_log(True, i)
                df = pd.read_csv(data_path)
                try:
                    if(validate_labware.sense_labware(axis, df)):
                        print('LABWARE!')
                    else:
                        print('NO LABWARE ;(')
                except:
                    print('no baseline data')
            # Save and validate
            curr_dir = os.curdir
            logs = os.path.join(curr_dir, "tof_log")
            plots = os.path.join(curr_dir, "tof_plots")
            
            if save_to_drive:
                google_drive_helper.upload_tof_files(drive_details, args.axis_name, f"Labware {labware+1}")
            if save_local:
                print('Updating Local Dataframe')
                for file in os.listdir(logs):
                    index = file.index('LAB')
                    labware_stacked = file[index+3:index+4]
                    path = os.path.abspath(os.path.join(logs, file))
                    write_row = manage_df.append_file(Path(path).stem, path, drive_details, labware_stacked=labware_stacked, axis=args.axis_name, labware_num=f"Labware {labware+1}")
                    if save_to_sheets:
                        print('Updating Sheets')
                        manage_df.update_sheet(write_row, sheet )
                file_manager.remove_folder(logs)
                file_manager.remove_folder(plots)
                print("Test Completed!")
    else:
        while True:
            sensor.get_histogram_zone(args.zones)
            time.sleep(1.0)

