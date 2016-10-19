import logging
from logging.config import dictConfig


logging_config = dict(
    version=1,
    formatters={
        'basic': {
            'format': '%(asctime)s %(name)s %(levelname)s [Line %(lineno)s]     %(message)s'  #NOQA
        }
    },
    handlers={
        'debug': {
            'class': 'logging.StreamHandler',
            'formatter': 'basic',
            'level': logging.DEBUG},
        'development': {
            'class': 'logging.StreamHandler',
            'formatter': 'basic',
            'level': logging.WARNING},
    },
    root={
        'handlers': ['development'],
    },
)
dictConfig(logging_config)


def get_logger(name=None):
    return logging.getLogger(name)
