PACKAGE_NAME=tv4-via-typenames
DEFINITELY_TYPED=~/devel/reference/borisyankov/DefinitelyTyped




all: build test

build: build-amd build-commonjs build-tests

test: test-commonjs

setup:
	npm install
	make install-decls
	git checkout decl/tv4/tv4.d.ts

.PHONY: clean
clean:
	rm -fr amd commonjs generated
	mkdir amd commonjs


.PHONY: echo
echo:
	echo common_commonjs_filenames=$(common_commonjs_filenames)



# if this install is for a dependent package
#     copy the declaration files into the containing project
npm-postinstall:
	@if [ -f '../../package.json' ]; then \
		echo This is a dependent package, copying Typescript declaration files into main project... ;\
		mkdir -p ../../decl ;\
		cp -r decl/$(PACKAGE_NAME) ../../decl;\
	fi

# if this uninstall is for a dependent package
#     remove the declaration files from the containing project
npm-uninstall:
	@if [ -f '../../package.json' ]; then \
		rm -fr ../../decl/$(PACKAGE_NAME);\
	fi

dev_decls=chai mocha
dependent_decls=node tv4 es6-promise

install-decls:
	mkdir -p decl
	$(foreach package, $(dev_decls), rm -fr decl/$(package); cp -r $(DEFINITELY_TYPED)/$(package) decl;)
	$(foreach package, $(dependent_decls), rm -fr decl/$(package); cp -r $(DEFINITELY_TYPED)/$(package) decl;)


decl_files=$(wildcard decl/tv4-via-typenames/*.d.ts)

amd/%.js: src/ts/%.ts $(decl_files)
	tsc --noEmitOnError --target ES5 --module amd --outDir generated $<
	mv generated/$(@F) amd

commonjs/%.js: src/ts/%.ts $(decl_files)
	tsc --noEmitOnError --target ES5 --module commonjs --outDir generated $<
	mv generated/$(@F) commonjs


commonjs/%.js: test/src/ts/%.ts  $(decl_files)
	tsc --noEmitOnError --target ES5 --module commonjs --outDir generated $<
	mv generated/$(@F) commonjs


########################################################################################################
# Common



build-amd : amd/tv4-via-typenames.js

	
# commonjs/tv4-via-typenames.js: src/tv4-via-typenames.ts decl/tv4-via-typenames/tv4-via-typenames.d.ts
# 	tsc --module commonjs --outDir commonjs src/tv4-via-typenames.ts


build-commonjs : commonjs/tv4-via-typenames.js

# commonjs/tv4-via-typenames.tests.js: test/src/tv4-via-typenames.tests.ts decl/tv4-via-typenames/tv4-via-typenames.d.ts
# 	tsc --module commonjs --outDir commonjs test/src/tv4-via-typenames.tests.ts

test_ts_filename := $(wildcard test/src/ts/*.ts)
test_ts_basenames = $(notdir $(test_ts_filename))
test_js_basenames = $(test_ts_basenames:ts=js)
test_commonjs_filenames = $(addprefix commonjs/, $(test_js_basenames))

build-commonjs-tests: $(test_commonjs_filenames)
	
build-tests: build-commonjs-tests
	
test-tv4-via-typenames: build-commonjs build-tests
	mocha $(MOCHA_ARGS) -R spec commonjs/tv4-via-typenames.tests.js	
	
test-commonjs: test-tv4-via-typenames 


