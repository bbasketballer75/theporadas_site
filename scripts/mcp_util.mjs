export function out(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
}
export function fail(message, code = 1) {
  process.stderr.write(message + '\n');
  process.exit(code);
}
