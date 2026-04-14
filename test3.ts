async function test() {
  const res = await fetch('http://localhost:3000/api/market-data/%5ETA125.TA');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.substring(0, 100));
}
test();
