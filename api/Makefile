# opentrons api makefile

include ../scripts/push.mk
include ../scripts/python.mk

SHX := npx shx

# make push wheel file (= rather than := to expand at every use)
firmware = $(wildcard smoothie/*.hex)

# python and pipenv config
sphinx_build := $(pipenv) run sphinx-build -W --keep-going
# todo(mm, 2021-10-04):
# 1. Resolve all Sphinx warnings.
# 2. Convert all recipes to use $(sphinx_build).
# 3. Delete $(sphinx_build_allow_warnings).
# github.com/Opentrons/opentrons/issues/6135
sphinx_build_allow_warnings := $(pipenv) run sphinx-build

ot_project := $(OPENTRONS_PROJECT)
project_rs_default = $(if $(ot_project),$(ot_project),robot-stack)
project_ir_default = $(if $(ot_project),$(ot_project),ot3)

# Find the version of the wheel from git using a helper script. We
# use python here so we can use the same version normalization that will be
# used to create the wheel.
wheel_file = dist/$(call python_get_wheelname,api,$(project_rs_default),opentrons,$(BUILD_NUMBER))

# Find the version of the sdist file from git using a helper script.
sdist_file = dist/$(call python_get_sdistname,api,$(project_rs_default),opentrons)

# Find the branch, sha, version that will be used to update the VERSION.json file
version_file = $(call python_get_git_version,api,$(project_rs_default),opentrons)

# These variables are for simulating python protocols
sim_log_level ?= info
simfile ?=

# These variables can be overriden when make is invoked to customize the
# behavior of pytest. For instance,
# make test tests=tests/opentrons/tools/test_pipette_memory.py would run only the
# specified test
tests ?= tests
cov_opts ?= --cov=src/opentrons --cov-report term-missing:skip-covered --cov-report xml:coverage.xml
test_opts ?=

# These variables must be overridden when make deploy or make deploy-staging is run
# to set the auth details for pypi
pypi_username ?=
pypi_password ?=

# Host key location for robot
ssh_key ?= $(default_ssh_key)
# Other SSH args for robot
ssh_opts ?= $(default_ssh_opts)
# Helper to safely bundle ssh options
ssh_helper = $(if $(ssh_key),-i $(ssh_key)) $(ssh_opts)

twine_auth_args := --username $(pypi_username) --password $(pypi_password)
twine_repository_url ?= $(pypi_test_upload_url)

# Defined separately than the clean target so the wheel file doesn’t have to
# depend on a PHONY target
clean_cmd = $(SHX) rm -rf build .coverage coverage.xml '*.egg-info'
clean_cache_cmd = $(SHX) rm -rf '**/__pycache__' '**/*.pyc' '**/.mypy_cache'
clean_wheel_cmd = $(clean_cmd) dist/*.whl
clean_sdist_cmd = $(clean_cmd) dist/*.tar.gz
clean_all_cmd = $(clean_cmd) dist

plot_type ?=

.PHONY: all
all: clean sdist wheel

.PHONY: setup
setup:
	$(pipenv) sync $(pipenv_opts)
	$(pipenv) run pip freeze

.PHONY: setup-ot2
setup-ot2:
	$(pipenv) sync $(pipenv_opts)
	$(pipenv) run pip uninstall -y python-can
	$(pipenv) run pip freeze

.PHONY: clean
clean: docs-clean
	$(clean_all_cmd)
	$(clean_cache_cmd)

.PHONY: teardown
teardown:
	$(pipenv) --rm

.PHONY: wheel
wheel: export OPENTRONS_PROJECT=$(project_rs_default)
wheel:
	$(clean_wheel_cmd)
	$(python) setup.py $(wheel_opts) bdist_wheel
	$(SHX) rm -rf build
	$(SHX) ls dist


.PHONY: sdist
sdist: export OPENTRONS_PROJECT=$(project_rs_default)
sdist:
	$(clean_sdist_cmd)
	$(python) setup.py sdist
	$(SHX) rm -rf build
	$(SHX) ls dist

.PHONY: test
test:
	$(pytest) $(tests) $(test_opts)

.PHONY: test-cov
test-cov:
	$(pytest) $(tests) $(test_opts) $(cov_opts)

.PHONY: test-ot2
test-ot2:
	$(pytest) -m 'not ot3_only' $(tests) $(test_opts) --ot2-only --ignore-glob="**/*ot3*"

.PHONY: lint
lint:
	$(python) -m mypy src tests
	$(python) -m black --check src tests setup.py
	$(python) -m flake8 src tests setup.py

.PHONY: format
format:
	$(python) -m black src tests setup.py

docs/build/html/v%: docs/v%
	$(sphinx_build) -b html -d docs/build/doctrees -n $< $@

docs/build/html/hardware: docs/hardware src/opentrons/hardware_control
	$(sphinx_build_allow_warnings) -b html -d docs/build/doctrees -n $< $@
	$(SHX) mkdir $@/_images/

docs/dist/v%: docs/build/html/v%
	$(SHX) mkdir -p $@
	$(SHX) cp -R $^ $(@D) $(if $(CI),,|| true)

docs/dist/hardware: docs/build/html/hardware
	$(SHX) mkdir -p $@
	$(SHX) cp -R $^ $(@D) $(if $(CI),,|| true)

docs/dist/ot1: docs/ot1
	$(SHX) mkdir -p $@
	$(SHX) cp -R $< $(@D)

docs/dist/%: docs/root/%
	$(SHX) mkdir -p $(@D)
	$(SHX) cp -R docs/root/* docs/dist/

.PHONY: docs
docs: docs/dist/index.html docs/dist/v1 docs/dist/v2 docs/dist/ot1 docs/dist/hardware

.PHONY: docs-clean
docs-clean:
	$(SHX) rm -rf docs/dist docs/build

.PHONY: dev
dev:
	echo "Command will be deprecated. Use \"make -C robot-server dev\""
	$(MAKE) -C ../robot-server dev

.PHONY: local-shell
local-shell:
	$(pipenv) shell

.PHONY: push-no-restart
push-no-restart: wheel
	$(call push-python-package,$(host),$(ssh_key),$(ssh_opts),$(wheel_file))

.PHONY: push
push: push-no-restart
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),"jupyter-notebook opentrons-robot-server")

.PHONY: push-no-restart-ot3
push-no-restart-ot3: sdist
	echo $(sdist_file)
	$(call push-python-sdist,$(host),$(ssh_key),$(ssh_opts),$(sdist_file),/opt/opentrons-robot-server,opentrons,src,,$(version_file))
	ssh $(ssh_helper) root@$(host) "mount -o remount,rw / && mkdir -p /usr/local/bin"
	scp $(ssh_helper) ./src/opentrons/hardware_control/scripts/ot3repl root@$(host):/usr/local/bin/
	scp $(ssh_helper) ./src/opentrons/hardware_control/scripts/ot3gripper root@$(host):/usr/local/bin/
	ssh $(ssh_helper) root@$(host) "mount -o remount,ro /"

.PHONY: push-ot3
push-ot3: push-no-restart-ot3
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),"opentrons-robot-server")

.PHONY: simulate
simulate:
	-$(python) -m opentrons.simulate -l $(sim_log_level) $(simfile)

# Launch the emulator application.
.PHONY: emulator
emulator:
	-$(python) -m opentrons.hardware_control.emulation.app

.PHONY: deploy
deploy: wheel sdist
	$(call python_upload_package,$(twine_auth_args),$(twine_repository_url),$(wheel_file),$(sdist_file))

# User must currently specify host, e.g.: `make term host=169.254.202.176`
.PHONY: term
term:
	ssh $(ssh_helper) root@$(host)

.PHONY: plot-session
plot-session:
	$(python) util/plot_session.py $(plot_type) $(plot_type).pdf

.PHONY: command-schema
command-schema: 
	$(python) src/opentrons/protocol_engine/commands/generate_command_schema.py --overwrite-shared-data
