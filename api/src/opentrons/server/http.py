import logging

from opentrons import config
from .endpoints import (networking, control, update,
                        deck_calibration)


log = logging.getLogger(__name__)


class HTTPServer(object):
    def __init__(self, app):
        self.app = app
        self.app.router.add_get(
            '/networking/status', networking.status)
        # TODO(mc, 2018-10-12): s/wifi/networking
        self.app.router.add_get(
            '/wifi/list', networking.list_networks)
        self.app.router.add_post(
            '/wifi/configure', networking.configure)
        self.app.router.add_post('/wifi/keys', networking.add_key)
        self.app.router.add_get('/wifi/keys', networking.list_keys)
        self.app.router.add_delete(
            '/wifi/keys/{key_uuid}', networking.remove_key)
        self.app.router.add_get(
            '/wifi/eap-options', networking.eap_options)
        self.app.router.add_post('/wifi/disconnect', networking.disconnect)
        self.app.router.add_post(
            '/identify', control.identify)
        self.app.router.add_get(
            '/modules', control.get_attached_modules)
        self.app.router.add_get(
            '/modules/{serial}/data', control.get_module_data)
        self.app.router.add_post(
            '/modules/{serial}', control.execute_module_command)
        if config.feature_flags.use_protocol_api_v2():
            self.app.router.add_post(
                '/modules/{serial}/update', update.update_module_firmware)
        else:
            self.app.router.add_post(
                '/modules/{serial}/update', update.cannot_update_firmware)
        self.app.router.add_post(
            '/camera/picture', control.take_picture)

        self.app.router.add_post('/calibration/deck/start',
                                 deck_calibration.start)
        self.app.router.add_post('/calibration/deck',
                                 deck_calibration.dispatch)
        self.app.router.add_get(
            '/pipettes', control.get_attached_pipettes)
        self.app.router.add_get(
            '/motors/engaged', control.get_engaged_axes)
        self.app.router.add_post(
            '/motors/disengage', control.disengage_axes)
        self.app.router.add_get(
            '/robot/positions', control.position_info)
        self.app.router.add_post(
            '/robot/move', control.move)
        self.app.router.add_post(
            '/robot/home', control.home)
        self.app.router.add_get(
            '/robot/lights', control.get_rail_lights)
        self.app.router.add_post(
            '/robot/lights', control.set_rail_lights)
