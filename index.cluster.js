// To use cluster:
// - rename index.js to app.js
// - rename index.cluster.js to index.js

const bootstrapCluster = require('./core/bootstrap-cluster');

bootstrapCluster('app.js', 2, __dirname);
