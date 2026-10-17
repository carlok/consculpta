# SPDX-License-Identifier: Apache-2.0
.PHONY: dev build build-engine build-single preview test coverage lint typecheck glsl e2e check

build-engine:
	npm run build:engine

dev:
	npm run dev

build:
	npm run build

build-single:
	npm run build:single

preview:
	npm run preview

test:
	npm run test

coverage:
	npm run coverage

lint:
	npm run lint

typecheck:
	npm run typecheck

glsl:
	npm run glsl

e2e:
	npm run e2e

check:
	npm run check
