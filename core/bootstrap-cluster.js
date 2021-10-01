const cluster = require('cluster');
const CTRL_C = 3;

/**
 * bootstrapCluster
 * @param {string} exec
 * @param {number} threadCount
 * @param {string} [cwd]
 */
function bootstrapCluster(exec, threadCount, cwd) {
  cluster.setupMaster({ exec, cwd });

  let active = threadCount;
  const workers = new Array(threadCount);

  const start = (id) => {
    const worker = cluster.fork();
    workers[id] = worker;
    worker.on('exit', (code) => {
      if (code !== 0) start(id);
      else if (--active === 0) process.exit(0);
    });
  };

  for (let id = 0; id < threadCount; id++) start(id);

  const stop = () => {
    for (const worker of workers) {
      worker.send('shutdown');
    }
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => {
      const key = data[0];
      if (key === CTRL_C) stop();
    });
  }
}

module.exports = bootstrapCluster;
