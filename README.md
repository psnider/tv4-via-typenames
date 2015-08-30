# tv4-via-typenames

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
See the separate module [tv4-via-typenames-node](https://github.com/psnider/tv4-via-typenames-node).

# Capabilities not Supported
tv4-via-typenames does not:  
- retrieve remote schema by following remote http-based IDs.
- support customizing the mapping between schema IDs and type names.
- support using missing schema (all schema must be present).


# API
To validate data as type instances against their schema, run these operations:

- construct an instance of this module
  For example, on node you use the SchemaFiles module:  
  ```
  let schema_files = new SchemaFiles(null, done);
  ```  
- Call loadRequiredSchema() with a list of the top-level type names of the schema you will use.  
  You may load the schema after the constructor's *done* callback is called:  
  ```
  let promise = schema_files.loadRequiredSchema(['SomeRequest', 'Person']);
  ```
  This will also recursively load any schema referenced by the named schema.  
- Call validate() to validate a data object.
  After the loadRequiredSchema() call resolves, you may validate data of any of the types referenced by those schema.  
  ```
  let validity = schema_files.validate('Person', some_person);
  ```

See the [TypeScript decl file](decl/tv4-via-typenames/tv4-via-typenames.d.ts) for the full API.

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

- es6
- es6 promises
- tv4


## Installing as a Dependency of Another Module
If you install this package as a dependency of another module, 
it will install its TypeScript declaration files into that module's *./decl* directory, using the npm script *npm-postinstall*.


# Build Setup
You only need to do this if you will be building (developing) tv4-via-typenames.

## Simple Setup

This module is built with TypeScript 1.5, so you must have it installed in order to build. See [http://www.typescriptlang.org/#Download](http://www.typescriptlang.org/#Download)
You do not need TypeScript in order to use this module,
as the code that makes up the distribution is all javascript.

You can install TypeScript globally:
```
npm install -g typescript
```

Then clone from git:
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
and setup the parts you want to use. We use Atom.

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

The test-runner is mocha, so you should probably have that installed globally:
```
npm install -g mocha
```

Then run the tests:
```
make test
```
