# couchdb-indexer

Both a requireable module and a CLI tool for indexing (caching) CouchDB views.

The utility functions by retrieving a database's design documents and then requesting a single row from a single view on each design document. The effect is that all views are then indexed and results can be thereafter retrieved without delay.

Options exist to filter the design documents that are indexed and to limit the number of threads used for indexing.

## Module

```sh
$ npm install --save couchdb-indexer
```

### Usage

Works with both callbacks and promises.

```js
var ixcouch = require('couchdb-indexer');

// callback
ixcouch('http://localhost:5984/my-db', function ( err ) {
  // ...
});

// promise
ixcouch('http://localhost:5984/my-db').then(function () {
  // success
});
```

#### Options

Optionally pass an options object as the second argument. Properties:

- `[options.filter=null] {string|RegExp}`: Only index views on design docs whose names match RegExp
- `[options.maxActiveTasks=NaN] {integer}`: View queries are queued so as to attempt to limit the maximum number of concurrent active tasks on the CouchDB server.

## CLI

```sh
$ npm install -g couchdb-indexer
$ ixcouch my-db
```

### Usage

```sh
$ ixcouch [options] <database_url>
```

#### Options

```
  --filter=<string>
    Only index views on design docs whose names match JavaScript RegExp

  --max-active-tasks=<integer>
    View queries are queued so as to attempt to limit the maximum number of concurrent active tasks on the CouchDB server.
    Active tasks are queried via route: GET {server_url}/_active_tasks.

    By default, there is no maximum - i.e. all view queries are sent simultaneously.

DATABASE URL

    Can be supplied in various formats:

      Full URL

      {host}/{database_name} - inferred protocol: http

      :{port}/{database_name} - inferred protocol: http; inferred hostname: 127.0.0.1

      {database_name} - inferred protocol: http; inferred host: 127.0.0.1:5984
```
