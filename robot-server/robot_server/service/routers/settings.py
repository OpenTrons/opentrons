import logging
from typing import Union, Dict
from http import HTTPStatus
from fastapi import APIRouter, HTTPException, Depends

from opentrons.hardware_control import HardwareAPILike
from opentrons.system import log_control
from opentrons.config import pipette_config, reset as reset_util, robot_configs

from robot_server.service.dependencies import get_hardware
from robot_server.service.models import V1BasicResponse
from robot_server.service.exceptions import V1HandlerError
from robot_server.service.models.settings import AdvancedSettings, LogLevel, \
    LogLevels, FactoryResetOptions, PipetteSettings, \
    PipetteSettingsUpdate, RobotConfigs, MultiPipetteSettings, \
    PipetteSettingsInfo, PipetteSettingsFields, FactoryResetOption

log = logging.getLogger(__name__)

router = APIRouter()


@router.post("/settings",
             description="Change an advanced setting (feature flag)",
             response_model=AdvancedSettings)
async def post_settings() -> AdvancedSettings:
    raise HTTPException(HTTPStatus.NOT_IMPLEMENTED, "not implemented")


@router.get("/settings",
            description="Get a list of available advanced settings (feature "
                        "flags) and their values",
            response_model=AdvancedSettings)
async def get_settings() -> AdvancedSettings:
    raise HTTPException(HTTPStatus.NOT_IMPLEMENTED, "not implemented")


@router.post("/settings/log_level/local",
             description="Set the minimum level of logs saved locally",
             response_model=V1BasicResponse)
async def post_log_level_local(
        log_level: LogLevel,
        hardware: HardwareAPILike = Depends(get_hardware)) -> V1BasicResponse:

    level = log_level.log_level

    if not level:
        raise V1HandlerError(message="log_level must be set",
                             status_code=HTTPStatus.UNPROCESSABLE_ENTITY)
    # Level name is upper case
    level_name = level.value.upper()
    # Set the application log level
    logging.getLogger('opentrons').setLevel(level.level_id)
    # Update and save settings
    await hardware.update_config(log_level=level_name)  # type: ignore
    robot_configs.save_robot_settings(hardware.config)  # type: ignore

    return V1BasicResponse(message=f'log_level set to {log_level}')


@router.post("/settings/log_level/upstream",
             description="Set the minimum level of logs sent upstream via"
                         " syslog-ng to Opentrons. Only available on"
                         " a real robot.",
             response_model=V1BasicResponse)
async def post_log_level_upstream(log_level: LogLevel) -> V1BasicResponse:
    log_level_value = log_level.log_level
    log_level_name = None if log_level_value is None else log_level_value.name
    ok_syslogs = {
        LogLevels.error.name: "err",
        LogLevels.warning.name: "warning",
        LogLevels.info.name: "info",
        LogLevels.debug.name: "debug"
    }

    syslog_level = "emerg"
    if log_level_name is not None:
        syslog_level = ok_syslogs[log_level_name]

    code, stdout, stderr = await log_control.set_syslog_level(syslog_level)

    if code != 0:
        msg = f"Could not reload config: {stdout} {stderr}"
        log.error(msg)
        raise V1HandlerError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=msg
        )

    if log_level_name:
        result = f"Upstreaming log level changed to {log_level_name}"
        getattr(log, log_level_name)(result)
    else:
        result = "Upstreaming logs disabled"
        log.info(result)

    return V1BasicResponse(message=result)


@router.get("/settings/reset/options",
            description="Get the settings that can be reset as part of "
                        "factory reset",
            response_model=FactoryResetOptions)
async def get_settings_reset_options() -> FactoryResetOptions:
    reset_options = reset_util.reset_options().items()
    return FactoryResetOptions(
        options=[
            FactoryResetOption(
                id=k,
                name=v.name,
                description=v.description)
            for k, v in reset_options
        ]
    )


@router.post("/settings/reset",
             description="Perform a factory reset of some robot data")
async def post_settings_reset_options(
        factory_reset_commands: Dict[reset_util.ResetOptionId, bool]) \
        -> V1BasicResponse:
    options = set(k for k, v in factory_reset_commands.items() if v)
    reset_util.reset(options)

    message = "Options '{}' were reset".format(
        ", ".join(o.name for o in options)) \
        if options else "Nothing to do"
    return V1BasicResponse(message=message)


@router.get("/settings/robot",
            description="Get the current robot config",
            response_model=RobotConfigs)
async def get_robot_settings(
        hardware: HardwareAPILike = Depends(get_hardware)) -> RobotConfigs:
    return hardware.config._asdict()  # type: ignore


@router.get("/settings/pipettes",
            description="List all settings for all known pipettes by id",
            response_model=MultiPipetteSettings,
            response_model_by_alias=True,
            response_model_exclude_unset=True)
async def get_pipette_settings() -> Union[Dict, MultiPipetteSettings]:
    res = {}
    for pipette_id in pipette_config.known_pipettes():
        # Have to convert to dict using by_alias due to bug in fastapi
        res[pipette_id] = _pipette_settings_from_config(
            pipette_config,
            pipette_id,
        ).dict(by_alias=True,
               exclude_unset=True)

    return res


@router.get("/settings/pipettes/{pipette_id}",
            description="Get the settings of a specific pipette by ID",
            response_model=PipetteSettings,
            response_model_by_alias=True,
            response_model_exclude_unset=True)
async def get_pipette_setting(pipette_id: str) -> Union[Dict, PipetteSettings]:
    if pipette_id not in pipette_config.known_pipettes():
        raise V1HandlerError(status_code=HTTPStatus.NOT_FOUND,
                             message=f'{pipette_id} is not a valid pipette id')
    # Have to convert to dict using by_alias due to bug in fastapi
    r = _pipette_settings_from_config(
        pipette_config, pipette_id
    ).dict(
        by_alias=True,
        exclude_unset=True,
    )
    return r


@router.patch("/settings/pipettes/{pipette_id}",
              description="Change the settings of a specific pipette",
              response_model=PipetteSettings,
              response_model_by_alias=True,
              response_model_exclude_unset=True)
async def patch_pipette_setting(
        pipette_id: str,
        settings_update: PipetteSettingsUpdate) \
        -> Union[Dict, PipetteSettings]:

    # Convert fields to dict of field name to value
    fields = settings_update.setting_fields or {}
    field_values = {k: v.value for k, v in fields.items()}
    if field_values:
        try:
            pipette_config.override(fields=field_values, pipette_id=pipette_id)
        except ValueError as e:
            raise V1HandlerError(status_code=HTTPStatus.PRECONDITION_FAILED,
                                 message=str(e))
    # Have to convert to dict using by_alias due to bug in fastapi
    r = _pipette_settings_from_config(
        pipette_config, pipette_id
    ).dict(
        by_alias=True,
        exclude_unset=True,
    )
    return r


def _pipette_settings_from_config(pc, pipette_id: str) -> PipetteSettings:
    """
    Create a PipetteSettings object from pipette config for single pipette

    :param pc: pipette config module
    :param pipette_id: pipette id
    :return: PipetteSettings object
    """
    mutuble_configs = pc.list_mutable_configs(pipette_id=pipette_id)
    fields = PipetteSettingsFields(
        **{k: v for k, v in mutuble_configs.items()}
    )
    c = pc.load_config_dict(pipette_id)
    return PipetteSettings(info=PipetteSettingsInfo(name=c.get('name'),
                                                    model=c.get('model')),
                           fields=fields)
