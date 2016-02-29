var Agent = require('http').Agent;
var Q = require('q');
var Qouch = require('qouch');

/**
 * Entry Point - supports promises and callbacks
 * @param {String|Qouch} [db] - either database URL or Qouch instance
 * @param {Object} [options] - options
 * @param {String|RegExp} [options.filter=null] - index only design docs with names matching RegExp filter
 * @param {Number} [options.maxActiveTasks=Infinity] - limit number of concurrent couch server active tasks - see GET {couch_server_url}/_active_tasks
 * @param {Function} [callback=undefined]
 */
exports = module.exports = function ( db, options, callback ) {
  var infinity = Math.min();

  var qouchDb = db instanceof Qouch ?
    db :
    new Qouch(db, new Agent({ maxSockets: infinity }));

  var opts = options && typeof options === 'object' ?
    options :
    {};

  var maxActiveTasks = isNaN(opts.maxActiveTasks) ?
    infinity :
    opts.maxActiveTasks;

  var filterRE = opts.filter instanceof RegExp ?
    opts.filter :
    new RegExp(typeof opts.filter === 'string' ? opt.filter : '.*');

  var cb = typeof callback === 'function' ?
    callback :
    ( typeof options === 'function' ? options : void 0 );

  return getViews(qouchDb, filterRE)
  .then(queryViews.bind(null, qouchDb, maxActiveTasks))
  .then(function success () {
    cb && cb();
  })
  .fail(function ( err ) {
    if ( cb ) {
      return cb(err);
    }
    throw err;
  });
};


/**
 * gets array of objects representing one view per design doc
 *
 * @private
 * @param {Qouch} db
 * @param {RegExp} filter - only return design docs with name confroming to pattern filter
 * @returns {Promise * Array.{ designDoc: String, view: String }}
 */
function getViews ( db, filter ) {
  return db.designDocs()
  .then(function ( designDocs ) {

    return designDocs.reduce(function ( arr, doc ) {
      var name = doc._id.match(/^_design\/(.*)/)[ 1 ];
      var aViewName = doc.views && Object.keys(doc.views)[ 0 ];

      if ( filter.test(name) && aViewName ) {
        arr.push({
          designDoc: name,
          view: aViewName
        });
      }

      return arr
    }, []);

  });
}

/**
 * queries views to trigger indexing of all views on respective design documents. Queues queries so as not to exceed maxActiveTasks
 *
 * @private
 * @param {Qouch} db
 * @param {Number} maxActiveTasks
 * @param {Array.{ designDoc: String, view: String }} outstanding
 * @returns {Promise * undefined}
 */
function queryViews ( db, maxActiveTasks, outstanding ) {
  var deferred = Q.defer();
  var inProgress = [];
  var databaseName = db.url.match(/\/([^/]+)\/?$/)[ 1 ];

  (function manageQueue() {
    db.activeTasks()
    .then(function ( activeTasks ) {

      // get names of design docs from this db that are currently being indexed
      var designDocsIndexing = activeTasks.reduce(function ( arr, task ) {
        if ( task.type === 'indexer' && task.database === databaseName ) {
          var designDocName = task.design_document.match(/^_design\/(.+)$/)[ 1 ];
          arr.push(designDocName);
        }
        return arr;
      }, []);

      // design docs not listed in active tasks are no longer indexing - update inProgress
      inProgress = inProgress.filter(function ( item ) {
        return ~designDocsIndexing.indexOf(item.designDoc);
      });

      var numNewViewsToQuery = Math.min(maxActiveTasks - activeTasks.length, outstanding.length);

      // query more views on outstanding design docs up to max active task limit
      if ( numNewViewsToQuery > 0 ) {
        var newQueries = outstanding.splice(0, numNewViewsToQuery);

        inProgress = inProgress.concat(newQueries);

        Q.all(
          newQueries.map(function ( item ) {
            return db.view(item.designDoc, item.view, { limit: 1, reduce: false })
          })
        )
        .fail(deferred.reject);
      }

      // if we're all done resolve promise and exit
      if ( !outstanding.length && !inProgress.length ) {
        return deferred.resolve();
      }

      // repeat function after interval
      setTimeout(manageQueue, 500);
    })
    .fail(deferred.reject);
  })();

  return deferred.promise;
}
