/// <reference path='../../typings/tv4-via-typenames/tv4-via-typenames.d.ts' />
/// <reference path="../../typings/es6-promise/es6-promise.d.ts" />
/// <reference path='../../typings/tv4/tv4.d.ts' />


//----------- COMMON code - both server and client -----------------


import tv4                              = require('tv4');
import tv4vtn                           = require('tv4-via-typenames');


// The name of the JSON schema file that describes the JSON schema, and against which we can validate our schema.
export var DRAFT_SCHEMA_ID  = 'http://json-schema.org/draft-04/schema#';
export var DRAFT_SCHEMA_TYPENAME  = 'Draft-04';
export var SCHEMA_ID_REGEXP     = /urn:([a-zA-Z0-9][-_a-zA-Z0-9]*).schema.json#/;
export var SCHEMA_ID_REF_REGEXP = /\$ref": "urn:([a-zA-Z0-9][-_a-zA-Z0-9]*).schema.json#/;

// Aids in debugging and test
var schemas : tv4vtn.IndexedSchemas;  // set by configure()

var getSchemaFromTypename : (typename : string) => Promise<{filename: string; schema: tv4.JsonSchema;}>;



function checkNativePromises() {
    let ok = ((typeof Promise !== "undefined") && Promise.toString().indexOf("[native code]") !== -1);
    if (!ok) {
        throw new Error('tv4-via-typenames requires es6 Promises. This javascript doesnt support them.');
    }
}


checkNativePromises();


 // configure may only be called once
export function configure(params : tv4vtn.SchemasConfig) : void {
    if (schemas) {
        throw new Error('configure may only be called once');
    }
    schemas = {};
    getSchemaFromTypename = params.getSchemaFromTypename;
}


// @return The schema ID that corresponds to the given typename.
function getSchemaIDFromTypename(typename : string) : string {
    if (typename === tv4vtn.DRAFT_SCHEMA_TYPENAME) {
        return tv4vtn.DRAFT_SCHEMA_ID;
    } else {
        return "urn:" + typename + ".schema.json#";
    }
}


// @return The typename that corresponds to the given schema ID.
function getTypenameFromSchemaID(id : string) : string {
    if (id === tv4vtn.DRAFT_SCHEMA_ID) {
        return tv4vtn.DRAFT_SCHEMA_TYPENAME;
    } else {
        var m = id.match(SCHEMA_ID_REGEXP);
        return ((m != null) ? m[1] : null);        
    }
}


export function loadSchemaDraftV4() : Promise<tv4.JsonSchema> {
    return getSchemaFromTypename(DRAFT_SCHEMA_TYPENAME).then(
        function(result) {
            registerSchema(result.schema);
            return result.schema;
        }
    );
}


// Regisiter the schema with the schema validation system.
// The schema is validated by this function, and registered only if it is valid.
// If a schema with this schema's typename has already been registered, then this returns true with no other action.
// @return true if successful, or if the schema had already been registered.
// false if either the schema.id doesn't contain the typename or if the schema is invalid.
function registerSchema(schema : tv4.JsonSchema) : boolean {
    var typename = getTypenameFromSchemaID(schema.id);
    var registered_schema = tv4.getSchema(schema.id);
    if (registered_schema == null) {
        var is_draft_schema = (schema.id === DRAFT_SCHEMA_ID);
        if (!is_draft_schema) {
            if (typename == null) {
                // error typename not available from id
                return false;
            }
        } else {
            typename = DRAFT_SCHEMA_TYPENAME;
        }
        
        var result = tv4_validateSchema(schema);
        if (result.errors.length === 0) {
            // some docs indicate addSchema() returns boolean, but the source code returns nothing
            tv4.addSchema(schema);
            schemas[typename] = schema;
            return true;
        } else {
            return false;
        }
    } else {
        // schema is already registered, don't re-register
        return true;
    }
}


// Validate the given JSON against the schema for typename.
function tv4_validate(typename: string, query: any) : tv4.MultiResult {
    var id = getSchemaIDFromTypename(typename);
    var schema = tv4.getSchema(id);
    if (schema == null) {
        var error : tv4.ValidationError = {code: 0, message: 'Schema not found', dataPath: '', schemaPath: id};
        return {valid: false, missing: [], errors: [error]};
    }
    var report = tv4.validateMultiple(query, schema);
    return report;
}


// Validate the given schema.
function tv4_validateSchema(schema: tv4.JsonSchema) : tv4.MultiResult {
    var is_draft_schema = (schema.id === DRAFT_SCHEMA_ID);
    var draft_schema = (is_draft_schema) ? schema : tv4.getSchema(DRAFT_SCHEMA_ID);
    var report = tv4.validateMultiple(schema, draft_schema);
    return report;
}


export function validate(typename: string, query: any) : tv4.MultiResult {
    var result = tv4_validate(typename, query);
    return result;
}


// Validate the given schema against the IETF /draft-04/ specification schema.
// @return The results of validation.
export function validateSchema(schema : any) : tv4.MultiResult {
    var result = tv4_validateSchema(schema);
    return result;
}




// Get the typenames that are referenced by '$ref' from the named schema
// @returns a promise that resolves with any of:
//   - a correctly loaded and validated schema
//   - a correctly loaded and invalidated schema
//  and that rejects in case of:
//   - failure to load the file
// @note: only exported for testing, not part of public API
export function getReferencedTypenames(query_typename : string) : Promise<tv4vtn.LoadSchemaResult> {
    return getSchemaFromTypename(query_typename).then(
        function(load_file_result) {
            let validation : tv4.MultiResult = validateSchema(load_file_result.schema);
            let do_register = (validation.valid && (validation.errors.length == 0));
            let registered = false;
            if (do_register) {
                registerSchema(load_file_result.schema);
                registered = true;
            }
            let referencedTypenames_set = {};
            let lines = JSON.stringify(load_file_result.schema, null, 4).split("\n");
            for (let i in lines) {
                let line = lines[i];
                let m = line.match(SCHEMA_ID_REF_REGEXP);
                if (m != null) {
                    var typename = m[1];
                    referencedTypenames_set[typename] = true;
                }
            }
            let referencedTypenames = Object.keys(referencedTypenames_set);
            let result : tv4vtn.LoadSchemaResult = {typename: query_typename, referencedTypenames: referencedTypenames, validation: validation, registered: registered};
            return result;
        }
    );
}


function loadSchemaTypesRecursive(query_typename, checked_schemas : tv4vtn.LoadSchemaResultIndex) : Promise<tv4vtn.LoadSchemaResultIndex> {
    return new Promise<tv4vtn.LoadSchemaResultIndex>(
        (resolve, reject) => {
            if (query_typename in checked_schemas) {
                // it has already been processed, so don't repeat
                resolve(checked_schemas);
            } else {
                let load_promise = getReferencedTypenames(query_typename).then(
                    (result : tv4vtn.LoadSchemaResult) => {
                        if (result.referencedTypenames.length > 0) {
                            var referenced_types_promises = [];
                            for (var i in result.referencedTypenames) {
                                var referenced_typename = result.referencedTypenames[i];
                                var promise = loadSchemaTypesRecursive(referenced_typename, checked_schemas);
                                referenced_types_promises.push(promise);
                            }
                            return Promise.all(referenced_types_promises).then(
                                function(results) {
                                    checked_schemas[result.typename] = result;
                                    return checked_schemas;
                                }
                            );
                        } else {
                            if (result.registered) {
                                checked_schemas[result.typename] = result;
                                return checked_schemas;
                            } else {
                                throw(new Error('Couldnt register typename=' + result.typename));
                            }
                            
                        }
                    }
                );
                resolve(load_promise);
            }
        }
    );
}


export function loadRequiredSchema(query_typenames: string | string[]) : Promise<tv4vtn.LoadSchemaResultIndex> {
    return new Promise<tv4vtn.LoadSchemaResultIndex>(
        (resolve, reject) => {
            var query_typenames_array;
            if (typeof query_typenames === 'string')
                query_typenames_array = [query_typenames];
            else
                query_typenames_array = query_typenames;
            var checked_schemas : tv4vtn.LoadSchemaResultIndex = {};
            var typenames_promises = [];
            for (let query_typename of query_typenames_array) {
                var promise = loadSchemaTypesRecursive(query_typename, checked_schemas);
                typenames_promises.push(promise);
            }
            let all_promise = Promise.all(typenames_promises).then(
                (results) => {
                    return(checked_schemas);
                }
            );
            resolve(all_promise);
        }        
    );
}


// @return true if the named schema has been loaded.
function hasSchema(typename : string) : boolean {
    return (typename in schemas);
}

// @return The named schema if it is already loaded, otherwise undefined.
function getLoadedSchema(typename: string) : tv4.JsonSchema {
    return schemas[typename];
}

// expose private functions for testing as needed.
export var test = {
    getSchemaIDFromTypename,
    getTypenameFromSchemaID,
    registerSchema,
    validateSchema,
    getReferencedTypenames,
    hasSchema,
    getLoadedSchema
}
