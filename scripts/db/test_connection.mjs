import sql from 'mssql';

const cs =
  process.env.SQLSERVER_CONNECTION_STRING ||
  'Server=localhost,14333;Database=theporadas;User Id=sa;Password=DevLocalStr0ng!Pass;Encrypt=true;TrustServerCertificate=true;';

async function main() {
  const pool = await sql.connect(cs);
  const result = await pool.request().query('SELECT 1 AS One');
  // eslint-disable-next-line no-console
  console.log('Result recordset:', result.recordset);
  await pool.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Connection test failed:', err);
  process.exitCode = 1;
});
