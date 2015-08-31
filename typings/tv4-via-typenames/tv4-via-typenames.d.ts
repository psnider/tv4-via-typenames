/// <reference path="../es6-promise/es6-promise.d.ts" />
/// <reference path='../tv4/tv4.d.ts' />



declare module 'tv4-via-typenames' {
    

    // TODO: Perhaps this belongs in tv4
    export interface ISchema {
        id : string;
        $schema : string;
        description : string;
        name : string;
        type : string;
        properties? : any;
        additionalProperties? : boolean;
        required?: string[];
    }


    export type IndexedSchemas = {[typename : string] : ISchema;};

    export interface ISchemasConfig {
        // Retrieves a schema given its typename.
        getSchemaFromTypename:  (typename : string) => Promise<{filename: string; schema: ISchema;}>;
    }


    // The status of loading a single schema.
    interface ILoadSchemaResult {
        typename: string;
        // These are the types referenced directly from this schema.
        // (And does not include types that may be referenced indirectly via the referenced schema.)
        referencedTypenames: string[];
        // true if the schema is registered just now or already was registered
        registered: boolean;
        validation: TV4MultiResult;
    }


    export type ILoadSchemaResultIndex = {[typename : string] : ILoadSchemaResult};
    
    export var DRAFT_SCHEMA_ID;
    export var DRAFT_SCHEMA_TYPENAME;
    export var SCHEMA_ID_REGEXP;

    // Must be called before using this module.
    export function configure(params : ISchemasConfig) : void;
    // Loads the Draft-4 standard schema.
    // This must follow the call to configure(), and complete before using any other functions.
    // @return A promise that resolves with the schema, or rejects with an error.
    export function loadSchemaDraftV4() : Promise<ISchema>;
    // Find the schemas with the given typenames, and all referenced schema, both directly and indirectly referenced.
    // All associated schema are registered.
    // When this succeeds, all schema required by the requested types have been loaded and validated.
    // @param query_typenames May be either a string, or an array of strings
    // @return A promise that resolves with an index of the schema load results, along with any errors encountered.
    //   The promise rejects with a actionable error.
    export function loadRequiredSchema(query_typenames: string | string[]) : Promise<ILoadSchemaResultIndex>;
    // Validate the given object against the schema for given typename.
    export function validate(typename: string, query: any) : TV4MultiResult;
    
    
    // only exported for testing
    export var test : {
            getSchemaIDFromTypename: (typename : string) => string;
            getTypenameFromSchemaID: (id : string) => string;
            registerSchema: (schema : ISchema) => boolean;
            validateSchema: (schema : any) => TV4MultiResult;
            getReferencedTypenames: (query_typename : string) => Promise<ILoadSchemaResult>;
            hasSchema: (typename : string) => boolean;
            getLoadedSchema: (typename : string) => ISchema;
        };
}
