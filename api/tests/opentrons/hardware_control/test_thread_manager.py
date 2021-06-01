import pytest
import weakref
from opentrons.hardware_control.modules import ModuleAtPort
from opentrons.hardware_control.thread_manager import ThreadManagerException,\
    ThreadManager
from opentrons.hardware_control.api import API


def test_build_fail_raises_exception():
    """
    Test that a builder that raises an exception raises
    a ThreadManagerException
    """
    def f():
        raise Exception()
    with pytest.raises(ThreadManagerException):
        ThreadManager(f)


def test_module_cache_add_entry():
    """ Test that _cached_modules updates correctly."""

    mod_names = ['tempdeck']
    thread_manager = ThreadManager(API.build_hardware_simulator,
                                   attached_modules=mod_names)

    # Test that module gets added to the cache
    mods = thread_manager.attached_modules
    wrapper_cache = thread_manager._cached_modules.copy()
    assert isinstance(wrapper_cache, weakref.WeakKeyDictionary)
    assert len(wrapper_cache) == 1
    assert mods[0] in wrapper_cache.values()

    # Test that calling attached modules doesn't add duplicate entries to cache
    mods2 = thread_manager.attached_modules
    wrapper_cache2 = thread_manager._cached_modules.copy()
    assert len(wrapper_cache2) == 1
    assert mods == mods2


async def test_module_cache_remove_entry():
    """Test that module entry gets removed from cache when module detaches. """
    mod_names = ['tempdeck', 'magdeck']
    thread_manager = ThreadManager(API.build_hardware_simulator,
                                   attached_modules=mod_names)

    mods_before = thread_manager.attached_modules
    assert len(mods_before) == 2

    await thread_manager._backend.module_controls.register_modules(
        removed_mods_at_ports=[
            ModuleAtPort(port='/dev/ot_module_sim_tempdeck0',
                         name='tempdeck')
        ])
    mods_after = thread_manager.attached_modules
    assert len(mods_after) == 1
