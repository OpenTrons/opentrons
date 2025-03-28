# shared-data makefile

# using bash instead of /bin/bash in SHELL prevents macOS optimizing away our PATH update
SHELL := bash

# These variables can be overriden when make is invoked to customize the
# behavior of jest
tests ?=
cov_opts ?= --coverage=true
test_opts ?=

# warning suppression variables for tests and linting
quiet ?= false

FORMAT_FILE_GLOB = "**/*.@(ts|tsx|js|json|md|yml)"

# Top level targets

.PHONY: all
all: clean dist

.PHONY: setup
setup: setup-py

.PHONY: dist
dist: dist-py

.PHONY: clean
clean: clean-py

.PHONY: format
format: format-js format-py

.PHONY: lint
lint: lint-js lint-py

# JavaScript targets

.PHONY: lib-js
lib-js: export NODE_ENV := production
lib-js:
	yarn vite build

.PHONY: build-ts
build-ts:
	yarn tsc --build --emitDeclarationOnly

.PHONY: format-js
format-js:
	yarn prettier --ignore-path ../.eslintignore --write $(FORMAT_FILE_GLOB)

.PHONY: lint-js
lint-js: lint-js-eslint lint-js-prettier

.PHONY: lint-js-eslint
lint-js-eslint:
	yarn eslint --ignore-path ../.eslintignore --quiet=$(quiet) "**/*.@(js|ts|tsx)"

.PHONY: lint-js-prettier
lint-js-prettier:
	yarn prettier --ignore-path ../.eslintignore --check $(FORMAT_FILE_GLOB)


# Python targets

.PHONY: setup-py
setup-py:
	$(MAKE) -C python setup-py

.PHONY: dist-py
dist-py:
	$(MAKE) -C python sdist wheel

.PHONY: clean-py
clean-py:
	$(MAKE) -C python clean

.PHONY: teardown-py
teardown-py:
	$(MAKE) -C python teardown

.PHONY: lint-py
lint-py:
	$(MAKE) -C python lint

.PHONY: format-py
format-py:
	$(MAKE) -C python format

.PHONY: push-no-restart
push-no-restart:
	$(MAKE) -C python push-no-restart

.PHONY: push
push:
	$(MAKE) -C python push

.PHONY: push-no-restart-ot3
push-no-restart-ot3:
	$(MAKE) -C python push-no-restart-ot3

.PHONY: push-ot3
push-ot3:
	$(MAKE) -C python push-ot3

.PHONY: deploy-py
deploy-py:
	$(MAKE) -C python deploy

.PHONY: test-py
test-py:
	$(MAKE) -C python test

.PHONY: test
test:
	$(MAKE) -C .. test-js-shared-data tests="$(tests)" test_opts="$(test_opts)"

.PHONY: test-cov
test-cov:
	make -C .. test-js-shared-data tests=$(tests) test_opts="$(test_opts)" cov_opts="$(cov_opts)"

