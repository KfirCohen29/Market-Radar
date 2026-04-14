async function test() {
  const res = await fetch('http://localhost:3000/api/market-data/BRK%2FB');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.substring(0, 100));
}
test();
