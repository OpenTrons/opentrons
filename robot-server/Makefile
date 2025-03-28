# opentrons robot server makefile

include ../scripts/push.mk
include ../scripts/python.mk

SHX := npx shx
REDOC := npx @redocly/cli

# Path of source package
SRC_PATH = robot_server
SCRIPTS_PATH = scripts
TESTS_PATH = tests

# Project to get the version for
ot_project := $(OPENTRONS_PROJECT)
project_rs_default = $(if $(ot_project),$(ot_project),robot-stack)
project_ir_default = $(if $(ot_project),$(ot_project),ot3)


# Find the version of the wheel from git using a helper script. We
# use python here so we can use the same version normalization that will be
# used to create the wheel.
wheel_file = dist/$(call python_get_wheelname,robot-server,$(project_rs_default),robot_server,$(BUILD_NUMBER))

# Find the version of the sdist from git using a helper script. We
# use python here so we can use the same version normalization that will be
# used to create the sdist.
sdist_file = dist/$(call python_get_sdistname,robot-server,$(project_rs_default),robot_server)

# Find the branch, sha, version that will be used to update the VERSION.json file
version_file = $(call python_get_git_version,robot-server,$(project_rs_default),robot_server)

# These variables can be overriden when make is invoked to customize the
# behavior of pytest. For instance,
# make test tests=tests/opentrons/tools/test_qc_scripts.py would run only the
# specified test
tests ?= tests
cov_opts ?= --cov=$(SRC_PATH) --cov-report term-missing:skip-covered --cov-report xml:coverage.xml
test_opts ?=

black_opts := --extend-exclude tests/integration/persistence_snapshots/

# Host key location for robot
ssh_key ?= $(default_ssh_key)
# Pubkey location for robot to install with install-key
ssh_pubkey ?= $(ssh_key).pub
# Other SSH args for robot
ssh_opts ?= $(default_ssh_opts)

# Source discovery
# For the python sources
ot_py_sources := $(filter %.py,$(shell $(SHX) find $(SRC_PATH)))
ot_sources := $(ot_py_sources)

# Defined separately than the clean target so the wheel file doesn’t have to
# depend on a PHONY target
clean_cmd = $(SHX) rm -rf build .coverage coverage.xml '*.egg-info'
clean_cache_cmd = $(SHX) rm -rf '**/__pycache__' '**/*.pyc' '**/.mypy_cache'
clean_wheel_cmd = $(clean_cmd) dist/*.whl
clean_sdist_cmd = $(clean_cmd) dist/*.tar.gz
clean_all_cmd = $(clean_cmd) dist
# Uvicorn command to run the robot server in dev mode.
#
# "--lifespan on" ensures errors in startup and shutdown handlers won't be hidden.
# See github.com/encode/starlette/issues/1138, fixed in Starlette v0.16.0?
#
# todo(mm, 2021-07-08): Figure out how to run the server with Python development
# mode enabled, to expose more errors and warnings.
#   * Using a Makefile target-specific variable to set PYTHONDEVMODE=1
#     doesn't work because it applies the variable to the whole `pipenv run`
#     command, and we only want our inner server process running under dev mode,
#     not the outer pipenv process.
#   * Adding PYTHONDEVMODE=1 to the .env file specified by
#     OT_ROBOT_SERVER_DOT_ENV_PATH doesn't work because that's read too late.
#   * Doing `pipenv run env PYTHONDEVMODE=1 uvicorn ...` works, except it's
#     probably POSIX-only.
dev_port ?= "31950"
dev_host ?= "localhost"
run_dev ?= uvicorn "robot_server.app:app" --host $(dev_host) --port $(dev_port) --ws wsproto --lifespan on --reload --reload-dir robot_server

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
clean:
	$(clean_all_cmd)
	$(clean_cache_cmd)

.PHONY: teardown
teardown:
	$(pipenv) --rm

.PHONY: wheel
wheel: export OPENTRONS_PROJECT=$(project_rs_default)
wheel: setup.py $(ot_sources)
	$(clean_wheel_cmd)
	$(python) setup.py $(wheel_opts) bdist_wheel
	$(SHX) rm -rf build
	$(SHX) ls dist

.PHONY: sdist
sdist: export OPENTRONS_PROJECT=$(project_rs_default)
sdist: setup.py $(ot_sources)
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

.PHONT: test-fast
test-fast:
	$(pytest) $(tests) $(test_opts) -m 'not slow'

.PHONY: lint
lint:
	$(python) -m mypy $(SRC_PATH) $(SCRIPTS_PATH) $(TESTS_PATH)
	$(python) -m black $(black_opts) --check .
	$(python) -m flake8 $(SRC_PATH) $(SCRIPTS_PATH) $(TESTS_PATH) setup.py

.PHONY: format
format:
	$(python) -m black $(black_opts) .

.PHONY: _dev
_dev:
	$(pipenv) run $(run_dev)

.PHONY: dev
dev: dev-ot2

.PHONY: dev-flex
dev-flex: export OT_ROBOT_SERVER_DOT_ENV_PATH ?= dev-flex.env
dev-flex: _dev

.PHONY: dev-ot2
dev-ot2: export OT_ROBOT_SERVER_DOT_ENV_PATH ?= dev.env
dev-ot2: _dev


.PHONY: dev-with-emulator
dev-with-emulator: export OT_ROBOT_SERVER_DOT_ENV_PATH ?= emulator.env
dev-with-emulator:
	$(pipenv) run $(run_dev)


.PHONY: dev-with-ot3-emulator
dev-with-ot3-emulator: export OT_ROBOT_SERVER_DOT_ENV_PATH ?= emulator_ot3.env
dev-with-ot3-emulator:
	$(pipenv) run $(run_dev)


.PHONY: local-shell
local-shell:
	$(pipenv) shell

.PHONY: push
push: wheel
	$(call push-python-package,$(host),$(ssh_key),$(ssh_opts),$(wheel_file))
	$(call push-systemd-unit,$(host),$(ssh_key),$(ssh_opts),./opentrons-robot-server.service)
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),opentrons-robot-server)

.PHONY: push-ot3
push-ot3: sdist
	$(call push-python-sdist,$(host),$(ssh_key),$(ssh_opts),$(sdist_file),"/opt/opentrons-robot-server","robot_server",,,$(version_file))
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),opentrons-robot-server)

.PHONY: install-key
install-key:
	curl -X POST $(host):31950/server/ssh_keys\
		-H "Content-Type: application/json"\
		-d "{\"key\":\"$(shell cat $(ssh_pubkey))\"}"

.PHONY: restart
restart:
	curl -X POST http://$(host):31950/server/restart

.PHONY: change-right
change-right:
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"target": "mount", "mount": "right", "point": [65, 40, 30]}' \
		http://$(host):31950/robot/move
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"axes": ["c"]}' \
		http://$(host):31950/motors/disengage


.PHONY: change-left
change-left:
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"target": "mount", "mount": "left", "point": [325, 40, 30]}' \
		http://$(host):31950/robot/move
	curl -X POST \
		-H "Content-Type: application/json" \
		-d '{"axes": ["b"]}' \
		http://$(host):31950/motors/disengage

# User must currently specify host, e.g.: `make term host=169.254.202.176`
.PHONY: term
term:
	ssh -i $(ssh_key) $(ssh_opts) root@$(host)


.PHONY: docs
docs:
	$(SHX) mkdir -p docs/build/
	$(python) ./scripts/spec_generator.py docs/build/openapi.json
	$(SHX) mkdir -p docs/dist/http
	$(REDOC) build-docs docs/build/openapi.json -o docs/dist/http/api_reference.html
