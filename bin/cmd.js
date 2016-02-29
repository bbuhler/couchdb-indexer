#!/usr/bin/env node
var indexer = require('../');
var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));
var dbURL = argv._[ 0 ];
var maxActiveTasks = argv['max-active-tasks'];
var filter = argv['filter'] || '';

if ( argv.version ) {
  return console.log(require('../package.json').version);
}

if ( maxActiveTasks === void 0 ) {
  maxActiveTasks = Math.min(); // Infinity
}

if ( !dbURL || isNaN(maxActiveTasks) || argv.h || argv.help ) {
  return fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
}

// support abbreviated URLs...

switch ( true ) {
  case /^[a-z][a-z0-9_]+$/.test(dbURL):
    // just database name
    dbURL = 'http://127.0.0.1:5984/' + dbURL;
    break;
  case /^:[0-9]+\/[a-z][a-z0-9_-]+$/.test(dbURL):
    // port and database name
    dbURL = 'http://127.0.0.1' + dbURL;
    break;
  case /^(?!https?|[:/])/.test(dbURL):
    // protocol missing: infer http
    dbURL = 'http://' + dbURL;
    break;
}

if ( dbURL !== argv._[ 0 ] ) {
  console.log('Inferring parts of database URL not supplied: %s -> %s\n', argv._[ 0 ], dbURL);
}

return indexer(dbURL, {
  maxActiveTasks: maxActiveTasks,
  filter: filter
})
.then(function () {
  console.log('All views indexed for database: %s', dbURL);
})
.fail(function ( err ) {
  console.log('Error:', err.message);
  console.log(err.stack);
  throw err;
});
