const levels = ['debug', 'info', 'warn', 'error'];
let currentLevel = process.env.LOG_LEVEL || 'info';
function shouldLog(level) { return levels.indexOf(level) >= levels.indexOf(currentLevel); }
function log(level, message, meta) {
  if (!shouldLog(level)) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta) console[level === 'debug' ? 'log' : level](line, meta); else console[level === 'debug' ? 'log' : level](line);
}
module.exports = { setLevel: level => { currentLevel = levels.includes(level) ? level : 'info'; }, debug: (m,x)=>log('debug',m,x), info:(m,x)=>log('info',m,x), warn:(m,x)=>log('warn',m,x), error:(m,x)=>log('error',m,x) };
