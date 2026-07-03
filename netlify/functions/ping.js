// Starter serverless function — proves the functions pipeline works.
// Reachable at /.netlify/functions/ping once deployed.
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ok: true, app: 'One more Kilo!', time: new Date().toISOString() })
});
