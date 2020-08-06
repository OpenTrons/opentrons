import typing
from . import file_operators as io, helpers, types as local_types


def check_index_version(index_path: local_types.StrPath):
    index_file = io.read_cal_file(str(index_path))
    version = index_file.get('version', 0)
    if version == 0:
        migrate_index_0_to_1(index_path)


def migrate_index_0_to_1(index_path: local_types.StrPath):
    """
    Previously, the index file was keyed as
    ```
    uri: {id: hash,
          slot: hash+parent,
          module: {{moduletype}: '{slot}-{moduletype}'}
    ```
    Now, the format is saved as
    ```
    labware_hash : {
        uri: uri,
        slot: hash+parent,
        module: {
            parent: {moduletype},
            fullParent: {slot}-{moduletype}}
    ```
    This function ensures any index files are migrated over to
    the correct format so users do not lose their calibrations
    """
    index_file = io.read_cal_file(str(index_path))
    migrated_file: typing.Dict = {}
    for key, data in index_file.items():
        if helpers.is_uri(key):
            uri = key
            full_hash = data['slot']
            if data['module']:
                parent, full_parent = list(data['module'].items())[0]
                module = {
                    'parent': parent,
                    'fullParent': full_parent}
            else:
                module = {}
            migrated_file[full_hash] = {
                "uri": f'{uri}',
                "slot": full_hash,
                "module": module
                }
        else:
            migrated_file[key] = data
    migrated_file['version'] = 1
    io.save_to_file(index_path, migrated_file)
