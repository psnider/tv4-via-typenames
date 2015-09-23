# tv4-via-typenames
[![NPM version](http://img.shields.io/npm/v/tv4-via-typenames.svg)](https://www.npmjs.org/package/tv4-via-typenames)
[![Build Status via Travis CI](https://travis-ci.org/psnider/tv4-via-typenames.svg?branch=master)](https://travis-ci.org/psnider/tv4-via-typenames)
[![Coverage Status](https://coveralls.io/repos/psnider/tv4-via-typenames/badge.svg?branch=master&service=github)](https://coveralls.io/github/psnider/tv4-via-typenames?branch=master)
[![Dependencies](https://david-dm.org/psnider/tv4-via-typenames.svg)](https://www.npmjs.org/package/tv4-via-typenames)

# Overview
tv4-via-typenames provides a typename-oriented schema loading and validation system.
It has a minimal interface for validating typed data against JSON-schemas from like-named files.
It wraps the [tv4](https://www.npmjs.com/package/tv4) module,
and validates data against [draft-4 JSON schema](http://json-schema.org/).  

tv4-via-typenames recursively loads, validates, and registers referenced schema, and all of their referenced schema,
both those referenced directly and indirectly. Schema are validated against the draft-4 standard.
tv4-via-typenames registers only correct schema, and returns errors for any incorrect schema.
 
tv4-via-typenames works for either client or server.  


# A Complete Example for Node
See the separate module [tv4-via-typenames-node](https://www.npmjs.com/package/tv4-via-typenames-node).

# Capabilities not Supported
tv4-via-typenames does not:  
- retrieve remote schema by following remote http-based IDs.
- support customizing the mapping between schema IDs and type names.
- support using missing schema (all schema must be present).


# API
These are the main components of the API.
You can find the full API in the [TypeScript declaration file](typings/tv4-via-typenames/tv4-via-typenames.d.ts) for this module.

The function signatures are given with their TypeScript type annotations.
These examples assume that tv4-via-typenames has been loaded into variable *tv4vtn*.

- ```configure(params : ISchemasConfig) : void```  
  configure this module with your function that retrieves schemas.  
  In [tv4-via-typenames-node](https://www.npmjs.com/package/tv4-via-typenames-node),
  *getSchemaFromTypename* reads schema files from the local file system.  
  For a client, *getSchemaFromTypename* might request schemas from a server.  
  ```
  tv4vtn.configure({getSchemaFromTypename: myGetSchemasFunction}});
  ```  
- ```loadSchemaDraftV4() : Promise<ISchema>```  
  Loads the Draft-4 standard schema.
  This must follow the call to configure(), and complete before using any other functions.
  Returns a promise that resolves with the schema, or rejects with an error.  
  ```
  let v4Promise = tv4vtn.loadSchemaDraftV4();
  ```
- ```loadRequiredSchema(typenames: string | string[]) : Promise<ILoadSchemaResultIndex>```  
  Find the schemas with the given typenames, and all referenced schema, both directly and indirectly referenced.
  When this succeeds, all schema required by the requested types have been loaded and validated.
  You may call this function as needed. A schema will only be loaded and registered once,
  regardless of how many times it is referenced.
  Don't call this function until loadSchemaDraftV4() has resolved.
  Returns a promise that resolves with an index of the schema load results, along with any errors encountered, or rejects with an error.  
  ```
  let loadPromise = tv4vtn.loadRequiredSchema(['Person', 'UUID']);
  ```
- ```validate(typename: string, obj: any) : TV4MultiResult```  
  Validate the given object against the schema for given typename.
  You may call validate with a given typename after a loadRequiredSchema() has loaded that typename.
  The typename may be for one of the indirectly referenced types.  
  ```
  let validity = tv4vtn.validate('EmailAddress', user_entered_email_address);
  ```
  
See the tests for more examples of usage.

# Conventions

- The name of the type (TYPENAME) of a data object is used as the key for locating all schema-related data.
- Schema names match the TYPENAME.
- Schema IDs are: urn:TYPENAME.schema.json#
- The $schema field is: http://json-schema.org/draft-04/schema#
- All references to other schema use the same conventions. So a $ref field contains a schema ID as above.


# Install
```
npm install tv4-via-typenames
```
You may use this module directly as a commonjs module or as an amd module.


Dependencies

- es5
- es6 promises
- tv4


## Installing as a Dependency of Another Module
If you install this package as a dependency of another module, 
it will install its TypeScript declaration files into that module's *./typings* directory, using the npm script *npm-postinstall*.


# Build Setup
You only need to do this if you will be building (developing) tv4-via-typenames.

## Simple Setup

This module is built with TypeScript 1.5, so you must have it installed in order to build.
**npm install** will install *TypeScript* and *tsd* locally.
See [http://www.typescriptlang.org/#Download](http://www.typescriptlang.org/#Download)

(You do not need TypeScript in order to use this module,
as the code that makes up the distribution is all javascript.)

Start by cloning from git:
```
git clone git@github.com:psnider/tv4-via-typenames.git
```

This code expects that ./commonjs is on node's load path:
```
NODE_PATH=$(NODE_PATH):./commonjs
```

And prepare your new repo for building with:
```
make setup
```
## Full Environment Setup
See our full instructions for setting up a [MEAN stack + TypeScript](https://github.com/psnider/setup-mean-ts) enviroment,
and setup the parts you want to use. We use Atom as our editor.

# Build
To build:
```
make build
```

To force a clean build:
```
make clean build
```

To build and test:
```
make
```


# Test

**npm install** will install *mocha* and *chai* locally.

Then run the tests:
```
make test
```
