/// <reference path='../../typings/tv4-via-typenames/tv4-via-typenames.d.ts' />
/// <reference path="../../typings/es6-promise/es6-promise.d.ts" />
/// <reference path='../../typings/tv4/tv4.d.ts' />
//----------- COMMON code - both server and client -----------------
var tv4 = require('tv4');
var tv4vtn = require('tv4-via-typenames');
// The name of the JSON schema file that describes the JSON schema, and against which we can validate our schema.
exports.DRAFT_SCHEMA_ID = 'http://json-schema.org/draft-04/schema#';
exports.DRAFT_SCHEMA_TYPENAME = 'Draft-04';
exports.SCHEMA_ID_REGEXP = /urn:([a-zA-Z0-9][-_a-zA-Z0-9]*).schema.json#/;
exports.SCHEMA_ID_REF_REGEXP = /\$ref": "urn:([a-zA-Z0-9][-_a-zA-Z0-9]*).schema.json#/;
// Aids in debugging and test
var schemas; // set by configure()
var getSchemaFromTypename;
function checkNativePromises() {
    var ok = ((typeof Promise !== "undefined") && Promise.toString().indexOf("[native code]") !== -1);
    if (!ok) {
        throw new Error('tv4-via-typenames requires es6 Promises. This javascript doesnt support them.');
    }
}
checkNativePromises();
// configure may only be called once
function configure(params) {
    if (schemas) {
        throw new Error('configure may only be called once');
    }
    schemas = {};
    getSchemaFromTypename = params.getSchemaFromTypename;
}
exports.configure = configure;
// @return The schema ID that corresponds to the given typename.
function getSchemaIDFromTypename(typename) {
    if (typename === tv4vtn.DRAFT_SCHEMA_TYPENAME) {
        return tv4vtn.DRAFT_SCHEMA_ID;
    }
    else {
        return "urn:" + typename + ".schema.json#";
    }
}
// @return The typename that corresponds to the given schema ID.
function getTypenameFromSchemaID(id) {
    if (id === tv4vtn.DRAFT_SCHEMA_ID) {
        return tv4vtn.DRAFT_SCHEMA_TYPENAME;
    }
    else {
        var m = id.match(exports.SCHEMA_ID_REGEXP);
        return ((m != null) ? m[1] : null);
    }
}
function loadSchemaDraftV4() {
    return getSchemaFromTypename(exports.DRAFT_SCHEMA_TYPENAME).then(function (result) {
        registerSchema(result.schema);
        return result.schema;
    });
}
exports.loadSchemaDraftV4 = loadSchemaDraftV4;
// Regisiter the schema with the schema validation system.
// The schema is validated by this function, and registered only if it is valid.
// If a schema with this schema's typename has already been registered, then this returns true with no other action.
// @return true if successful, or if the schema had already been registered.
// false if either the schema.id doesn't contain the typename or if the schema is invalid.
function registerSchema(schema) {
    var typename = getTypenameFromSchemaID(schema.id);
    var registered_schema = tv4.getSchema(schema.id);
    if (registered_schema == null) {
        var is_draft_schema = (schema.id === exports.DRAFT_SCHEMA_ID);
        if (!is_draft_schema) {
            if (typename == null) {
                // error typename not available from id
                return false;
            }
        }
        else {
            typename = exports.DRAFT_SCHEMA_TYPENAME;
        }
        var result = tv4_validateSchema(schema);
        if (result.errors.length === 0) {
            // some docs indicate addSchema() returns boolean, but the source code returns nothing
            tv4.addSchema(schema);
            schemas[typename] = schema;
            return true;
        }
        else {
            return false;
        }
    }
    else {
        // schema is already registered, don't re-register
        return true;
    }
}
// Validate the given JSON against the schema for typename.
function tv4_validate(typename, query) {
    var id = getSchemaIDFromTypename(typename);
    var schema = tv4.getSchema(id);
    if (schema == null) {
        var error = { code: 0, message: 'Schema not found', dataPath: '', schemaPath: id };
        return { valid: false, missing: [], errors: [error] };
    }
    var report = tv4.validateMultiple(query, schema);
    return report;
}
// Validate the given schema.
function tv4_validateSchema(schema) {
    var is_draft_schema = (schema.id === exports.DRAFT_SCHEMA_ID);
    var draft_schema = (is_draft_schema) ? schema : tv4.getSchema(exports.DRAFT_SCHEMA_ID);
    var report = tv4.validateMultiple(schema, draft_schema);
    return report;
}
function validate(typename, query) {
    var result = tv4_validate(typename, query);
    return result;
}
exports.validate = validate;
// Validate the given schema against the IETF /draft-04/ specification schema.
// @return The results of validation.
function validateSchema(schema) {
    var result = tv4_validateSchema(schema);
    return result;
}
exports.validateSchema = validateSchema;
// Get the typenames that are referenced by '$ref' from the named schema
// @returns a promise that resolves with any of:
//   - a correctly loaded and validated schema
//   - a correctly loaded and invalidated schema
//  and that rejects in case of:
//   - failure to load the file
// @note: only exported for testing, not part of public API
function getReferencedTypenames(query_typename) {
    return getSchemaFromTypename(query_typename).then(function (load_file_result) {
        var validation = validateSchema(load_file_result.schema);
        var do_register = (validation.valid && (validation.errors.length == 0));
        var registered = false;
        if (do_register) {
            registerSchema(load_file_result.schema);
            registered = true;
        }
        var referencedTypenames_set = {};
        var lines = JSON.stringify(load_file_result.schema, null, 4).split("\n");
        for (var i in lines) {
            var line = lines[i];
            var m = line.match(exports.SCHEMA_ID_REF_REGEXP);
            if (m != null) {
                var typename = m[1];
                referencedTypenames_set[typename] = true;
            }
        }
        var referencedTypenames = Object.keys(referencedTypenames_set);
        var result = { typename: query_typename, referencedTypenames: referencedTypenames, validation: validation, registered: registered };
        return result;
    });
}
exports.getReferencedTypenames = getReferencedTypenames;
function loadSchemaTypesRecursive(query_typename, checked_schemas) {
    return new Promise(function (resolve, reject) {
        if (query_typename in checked_schemas) {
            // it has already been processed, so don't repeat
            resolve(checked_schemas);
        }
        else {
            var load_promise = getReferencedTypenames(query_typename).then(function (result) {
                if (result.referencedTypenames.length > 0) {
                    var referenced_types_promises = [];
                    for (var i in result.referencedTypenames) {
                        var referenced_typename = result.referencedTypenames[i];
                        var promise = loadSchemaTypesRecursive(referenced_typename, checked_schemas);
                        referenced_types_promises.push(promise);
                    }
                    return Promise.all(referenced_types_promises).then(function (results) {
                        checked_schemas[result.typename] = result;
                        return checked_schemas;
                    });
                }
                else {
                    if (result.registered) {
                        checked_schemas[result.typename] = result;
                        return checked_schemas;
                    }
                    else {
                        throw (new Error('Couldnt register typename=' + result.typename));
                    }
                }
            });
            resolve(load_promise);
        }
    });
}
function loadRequiredSchema(query_typenames) {
    return new Promise(function (resolve, reject) {
        var query_typenames_array;
        if (typeof query_typenames === 'string')
            query_typenames_array = [query_typenames];
        else
            query_typenames_array = query_typenames;
        var checked_schemas = {};
        var typenames_promises = [];
        for (var _i = 0; _i < query_typenames_array.length; _i++) {
            var query_typename = query_typenames_array[_i];
            var promise = loadSchemaTypesRecursive(query_typename, checked_schemas);
            typenames_promises.push(promise);
        }
        var all_promise = Promise.all(typenames_promises).then(function (results) {
            return (checked_schemas);
        });
        resolve(all_promise);
    });
}
exports.loadRequiredSchema = loadRequiredSchema;
// @return true if the named schema has been loaded.
function hasSchema(typename) {
    return (typename in schemas);
}
exports.hasSchema = hasSchema;
// @return The named schema if it is already loaded, otherwise undefined.
function getLoadedSchema(typename) {
    return schemas[typename];
}
exports.getLoadedSchema = getLoadedSchema;
// expose private functions for testing as needed.
exports.test = {
    getSchemaIDFromTypename: getSchemaIDFromTypename,
    getTypenameFromSchemaID: getTypenameFromSchemaID,
    registerSchema: registerSchema,
    validateSchema: validateSchema,
    getReferencedTypenames: getReferencedTypenames,
    hasSchema: hasSchema,
    getLoadedSchema: getLoadedSchema
};
