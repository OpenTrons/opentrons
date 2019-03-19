################################################################################
#
# python-opentrons-api
#
################################################################################

# Get a key from package.json (like version)
define get_pkg_json_key
	$(shell python -c "import json; print(json.load(open('$(BR2_EXTERNAL_OPENTRONS_MONOREPO_PATH)/api/src/opentrons/package.json'))[\"$(1)\"])")
endef

PYTHON_OPENTRONS_API_VERSION = $(call get_pkg_json_key,version)
PYTHON_OPENTRONS_API_LICENSE = $(call get_pkg_json_key,license)
PYTHON_OPENTRONS_API_LICENSE_FILES = $(BR2_EXTERNAL_OPENTRONS_MONOREPO_PATH)/LICENSE
PYTHON_OPENTRONS_API_SETUP_TYPE = setuptools
PYTHON_OPENTRONS_API_SITE_METHOD = local
PYTHON_OPENTRONS_API_SITE = $(BR2_EXTERNAL_OPENTRONS_MONOREPO_PATH)
PYTHON_OPENTRONS_API_SUBDIR = api
PYTHON_OPENTRONS_API_POST_INSTALL_TARGET_HOOKS = PYTHON_OPENTRONS_API_INSTALL_VERSION

define DUMP_BR_VERSION
$(shell python 2>&1 $(BR2_EXTERNAL_OPENTRONS_MONOREPO_PATH)/api/build_tools.py dump_br_version)
endef

define PYTHON_OPENTRONS_API_INSTALL_VERSION
	echo '$(call DUMP_BR_VERSION)' > $(BINARIES_DIR)/opentrons-api-version.json
endef

ot_api_name := python-opentrons-api

define PYTHON_OPENTRONS_API_INSTALL_INIT_SYSTEMD
	$(INSTALL) -D -m 0644 $(BR2_EXTERNAL_OPENTRONS_MONOREPO_PATH)/api/opentrons-api-server.service \
	  $(TARGET_DIR)/etc/systemd/system/opentrons-api-server.service

  mkdir -p $(TARGET_DIR)/etc/systemd/system/opentrons.target.wants

  ln -sf ../opentrons-api-server.service \
    $(TARGET_DIR)/etc/systemd/system/opentrons.target.wants/opentrons-api-server.service
endef

# Calling inner-python-package directly instead of using python-package macro
# because our directory layout doesn’t conform to buildroot’s expectation of
# having the directory name be the package name
$(eval $(call inner-python-package,python-opentrons-api,$(call UPPERCASE,$(ot_api_name)),$(call UPPERCASE,$(ot_api_name)),target))

