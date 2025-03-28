# step-generation makefile

# using bash instead of /bin/bash in SHELL prevents macOS optimizing away our PATH update
SHELL := bash

# These variables can be overridden when make is invoked to customize the
# behavior of jest
tests ?=
cov_opts ?= --coverage --pool=threads
test_opts ?=

.PHONY: test
test:
	$(MAKE) -C .. test-js-step-generation tests="$(tests)" test_opts="$(test_opts)"

.PHONY: test-cov
test-cov:
	make -C .. test-js-step-generation tests=$(tests) test_opts="$(test_opts)" cov_opts="$(cov_opts)"

