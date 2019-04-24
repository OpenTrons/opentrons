import logging
from logging.config import dictConfig
import sys
from typing import Any, Dict

from opentrons.config import CONFIG, OT_SYSTEM_VERSION


def _balena_config(level_value: int) -> Dict[str, Any]:
    serial_log_filename = CONFIG['serial_log_file']
    api_log_filename = CONFIG['api_log_file']
    return {
        'formatters': {
            'basic': {
                'format':
                '%(asctime)s %(name)s %(levelname)s [Line %(lineno)s] %(message)s'  # noqa: E501
            },
        },
        'handlers': {
            'debug': {
                'class': 'logging.StreamHandler',
                'formatter': 'basic',
                'level': level_value
            },
            'serial': {
                'class': 'logging.handlers.RotatingFileHandler',
                'formatter': 'basic',
                'filename': serial_log_filename,
                'maxBytes': 5000000,
                'level': logging.DEBUG,
                'backupCount': 3
            },
            'api': {
                'class': 'logging.handlers.RotatingFileHandler',
                'formatter': 'basic',
                'filename': api_log_filename,
                'maxBytes': 1000000,
                'level': logging.DEBUG,
                'backupCount': 5
            }
        },
        'loggers': {
            'opentrons': {
                'handlers': ['debug', 'api'],
                'level': level_value,
            },
            'opentrons.drivers.serial_communication': {
                'handlers': ['serial'],
                'level': logging.DEBUG
            }
        }
    }


def _buildroot_config(level_value: int) -> Dict[str, Any]:
    # Import systemd.journald here since it is generally unavailble on non
    # linux systems and we probably don't want to use it on linux desktops
    # either
    return {
        'version': 1,
        'formatters': {
            'message_only': {
                'format': '%(message)s'
            },
        },
        'handlers': {
            'api': {
                'class': 'systemd.journal.JournalHandler',
                'level': logging.DEBUG,
                'formatter': 'message_only',
                'SYSLOG_IDENTIFIER': 'opentrons-api',
            },
            'serial': {
                'class': 'systemd.journal.JournalHandler',
                'level': logging.DEBUG,
                'formatter': 'message_only',
                'SYSLOG_IDENTIFIER': 'opentrons-api-serial',
            }
        },
        'loggers': {
            'opentrons.drivers.serial_communication': {
                'handlers': ['serial'],
                'level': logging.DEBUG,
            },
            'opentrons': {
                'handlers': ['api'],
                'level': level_value,
            },
        },

    }


def _config(system_version: int, level_value: int) -> Dict[str, Any]:
    if system_version < 2:
        return _balena_config(level_value)
    else:
        return _buildroot_config(level_value)


def log_init(level_name: str):
    """
    Function that sets log levels and format strings. Checks for the
    OT_API_LOG_LEVEL environment variable otherwise defaults to INFO
    """
    fallback_log_level = 'INFO'
    ot_log_level = level_name.upper()
    if ot_log_level not in logging._nameToLevel:
        sys.stderr.write(
            f'OT Log Level {ot_log_level} not found. '
            f'Defaulting to {fallback_log_level}\n')
        ot_log_level = fallback_log_level
    level_value = logging._nameToLevel[ot_log_level]
    logging_config = _config(OT_SYSTEM_VERSION, level_value)
    dictConfig(logging_config)
