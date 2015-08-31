/// <reference path='../../../typings/node/node.d.ts' />
/// <reference path="../../../typings/es6-promise/es6-promise.d.ts" />
/// <reference path='../../../typings/mocha/mocha.d.ts' />
/// <reference path='../../../typings/chai/chai.d.ts' />
/// <reference path='../../../typings/tv4-via-typenames/tv4-via-typenames.d.ts' />
/// <reference path='../../../typings/tv4/tv4.d.ts' />
var fs = require('fs');
var CHAI = require('chai');
var expect = CHAI.expect;
var tv4vtn = require('tv4-via-typenames');
describe('tv4-via-typenames', function () {
    var SIMPLE_SCHEMA = {
        "id": "urn:Simple.schema.json#",
        "$schema": "http://json-schema.org/draft-04/schema#",
        "description": "A simple test schema.",
        "name": "Simple",
        "type": "string"
    };
    var SCHEMAS_DIR = './test/data/schemas';
    // TODO: find proper home for this general function
    function readJSONFile(filename) {
        return new Promise(function (resolve, reject) {
            fs.readFile(filename, { "encoding": "utf-8" }, function (error, data) {
                if (error) {
                    reject(error);
                }
                else {
                    try {
                        var obj = JSON.parse(data);
                        resolve({ filename: filename, obj: obj });
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }
    // load the schema for the named type from the like named file.
    // The promise returns the loaded schema
    function load_schema(typename) {
        var filename = SCHEMAS_DIR + '/' + typename + '.schema.json';
        return readJSONFile(filename).then(function (data) {
            return { filename: data.filename, schema: data.obj };
        });
    }
    // load the schema for the named type from the like named file, and register that schema
    function load_and_register_schema(typename) {
        return load_schema(typename).then(function (data) {
            var succeeded = tv4vtn.test.registerSchema(data.schema);
            return succeeded;
        });
    }
    function loadSchemaFromTypename(typename) {
        var schema = tv4vtn.test.getLoadedSchema(typename);
        if (schema) {
            return Promise.resolve({ filename: typename, schema: schema });
        }
        else {
            return load_schema(typename);
        }
    }
    function ensure_loadSchemaDraftV4(done) {
        tv4vtn.loadSchemaDraftV4().then(function (result) {
            done();
        }, function (error) {
            done(error);
        });
    }
    // Configure the schemas service to use readSchemaFileFromTypename() from the Schemas service, so we can use this projects schemas
    before(function () {
        var params = { getSchemaFromTypename: loadSchemaFromTypename };
        tv4vtn.configure(params);
    });
    describe('getSchemaIDFromTypename', function () {
        it('+ should generate URN as the ID', function () {
            var id = tv4vtn.test.getSchemaIDFromTypename('A');
            expect(id).to.equal('urn:A.schema.json#');
        });
        it('+ should get the ID for the Draft-04 standard', function () {
            var id = tv4vtn.test.getSchemaIDFromTypename(tv4vtn.DRAFT_SCHEMA_TYPENAME);
            expect(id).to.equal(tv4vtn.DRAFT_SCHEMA_ID);
        });
    });
    describe('getTypenameFromSchemaID', function () {
        it('+ should get typename from an ID', function () {
            var typename = tv4vtn.test.getTypenameFromSchemaID('urn:A1_b2.schema.json#');
            expect(typename).to.equal('A1_b2');
        });
        it('+ should get typename from the ID for the Draft-04 standard', function () {
            var typename = tv4vtn.test.getTypenameFromSchemaID(tv4vtn.DRAFT_SCHEMA_ID);
            expect(typename).to.equal(tv4vtn.DRAFT_SCHEMA_TYPENAME);
        });
    });
    describe('loadSchemaDraftV4', function () {
        it('+ should load the schema that describes the draft 4 JSON-schema standard', function (done) {
            expect(tv4vtn.test.hasSchema(tv4vtn.DRAFT_SCHEMA_TYPENAME)).to.be.false;
            var was_resolved = false;
            tv4vtn.loadSchemaDraftV4().then(function (result) {
                expect(tv4vtn.test.hasSchema(tv4vtn.DRAFT_SCHEMA_TYPENAME)).to.be.true;
                var schema = tv4vtn.test.getLoadedSchema(tv4vtn.DRAFT_SCHEMA_TYPENAME);
                expect(schema.id).to.equal('http://json-schema.org/draft-04/schema#');
                done();
            }, function (error) {
                done(error);
            });
        });
    });
    describe('registerSchema', function () {
        before(ensure_loadSchemaDraftV4);
        it('+ should register a schema upon the first request', function (done) {
            expect(tv4vtn.test.hasSchema('SHA1')).to.be.false;
            load_and_register_schema('SHA1').then(function (succeeded) {
                expect(succeeded).to.be.true;
                expect(tv4vtn.test.hasSchema('SHA1')).to.be.true;
                var schema = tv4vtn.test.getLoadedSchema('SHA1');
                expect(schema.id).to.equal('urn:SHA1.schema.json#');
                done();
            }, function (error) { done(error); });
        });
        it('- should not register a schema upon repeated request', function (done) {
            load_and_register_schema('SHA1').then(function (succeeded) {
                expect(succeeded).to.be.true;
                var schema = tv4vtn.test.getLoadedSchema('SHA1');
                // mark the existing schema, to test later that it was not reloaded
                schema['marked by test'] = true;
                return load_and_register_schema('SHA1').then(function (succeeded) {
                    expect(succeeded).to.be.true;
                    var schemaRetried = tv4vtn.test.getLoadedSchema('SHA1');
                    expect(schemaRetried).to.have.property('marked by test');
                    done();
                });
            }, function (error) { done(error); });
        });
        it('+ should not register an invalid schema', function (done) {
            expect(tv4vtn.test.hasSchema('test-invalid-type')).to.be.false;
            load_and_register_schema('test-invalid-type').then(function (succeeded) {
                expect(succeeded).to.be.false;
                expect(tv4vtn.test.hasSchema('test-invalid-type')).to.be.false;
                done();
            }, function (error) { done(error); });
        });
    });
    describe('validateSchema', function () {
        before(ensure_loadSchemaDraftV4);
        it('+ should validate a valid simple schema', function () {
            var result = tv4vtn.test.validateSchema(SIMPLE_SCHEMA);
            expect(result.errors).to.be.empty;
        });
        it('- should not validate an invalid simple schema', function () {
            var SCHEMA_WO_TYPE = {
                "id": "urn:ASHBC.schema.json#",
                "$schema": "http://json-schema.org/draft-04/schema#",
                "description": "A test schema without a type.",
                "name": "ABC",
                "type": "misspelled_typename"
            };
            var result = tv4vtn.test.validateSchema(SCHEMA_WO_TYPE);
            expect(result).to.not.be.null;
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.equal(1);
            var error = result.errors[0];
            expect(error.message).to.equal('Data does not match any schemas from "anyOf"');
        });
    });
    describe('loadRequiredSchema', function () {
        before(ensure_loadSchemaDraftV4);
        describe('getReferencedTypenames', function () {
            it('+ should return the types referenced directly in a schema by "$ref"', function (done) {
                tv4vtn.test.getReferencedTypenames('Person').then(function (result) {
                    expect(result.typename).to.equal('Person');
                    expect(result.referencedTypenames.length).to.equal(3);
                    expect(result.referencedTypenames.indexOf('EmailAddress')).to.not.equal(-1);
                    expect(result.referencedTypenames.indexOf('PersonName')).to.not.equal(-1);
                    expect(result.referencedTypenames.indexOf('DateTime')).to.not.equal(-1);
                    expect(result.registered).to.be.true;
                    expect(result.validation.valid).to.be.true;
                    done();
                });
            });
            it('should return data for an invalid schema', function (done) {
                tv4vtn.test.getReferencedTypenames('test-invalid-type').then(function (result) {
                    expect(result.typename).to.equal('test-invalid-type');
                    expect(result.registered).to.be.false;
                    expect(result.validation.valid).to.be.false;
                    done();
                });
            });
            it('should reject a schema that cant be loaded', function (done) {
                tv4vtn.test.getReferencedTypenames('test-no-schema-file').then(function (result) {
                    done(new Error('test-no-schema-file should have rejected'));
                }, function (error) {
                    expect(error.message).to.equal("ENOENT, open './test/data/schemas/test-no-schema-file.schema.json'");
                    done();
                });
            });
        });
        it('+ should register any new types referenced directly by a schema via "$ref"', function (done) {
            tv4vtn.loadRequiredSchema('Person').then(function (result) {
                expect(tv4vtn.test.hasSchema('EmailAddress')).to.be.true;
                expect(tv4vtn.test.hasSchema('PersonName')).to.be.true;
                expect(tv4vtn.test.hasSchema('DateTime')).to.be.true;
                done();
            });
        });
        it('+ should return the types referenced indirectly by a schema via "$ref"', function (done) {
            // Person refers to DateTime which refers to Date and Time
            tv4vtn.loadRequiredSchema('Person').then(function (result) {
                expect(result).to.have.property('Person');
                expect(result).to.have.property('EmailAddress');
                expect(result).to.have.property('PersonName');
                expect(result).to.have.property('DateTime');
                expect(result).to.have.property('Date');
                expect(result).to.have.property('Time');
                done();
            });
        });
        it('+ should return an error for an invalid schema', function (done) {
            tv4vtn.loadRequiredSchema('test-invalid-type').then(function (result) {
                done(new Error('expected promise to reject'));
            }, function (error) {
                expect(error.message).to.equal('Couldnt register typename=test-invalid-type');
                done();
            });
        });
    });
    describe('validate', function () {
        before(ensure_loadSchemaDraftV4);
        it('+ should validate a valid simple object', function () {
            tv4vtn.test.registerSchema(SIMPLE_SCHEMA);
            var result = tv4vtn.validate('Simple', 'any string is ok');
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });
        it('- should not validate an object for which there is no schema', function () {
            var result = tv4vtn.validate('NON_EXISTANT', 'any string is ok');
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.equal(1);
            var error = result.errors[0];
            expect(error.message).to.equal('Schema not found');
        });
        it('+ should not validate an invalid simple object', function () {
            tv4vtn.test.registerSchema(SIMPLE_SCHEMA);
            var result = tv4vtn.validate('Simple', 0);
            expect(result).to.not.be.null;
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.equal(1);
            var error = result.errors[0];
            expect(error.message).to.equal('Invalid type: number (expected string)');
        });
    });
});
