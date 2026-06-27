const http = require('http');

function request(path, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // 1. Register user
  const reg = await request('/api/users/register', 'POST', {}, { username: 'temp_user', email: 'temp_user@example.com' });
  console.log('Register status:', reg.status, reg.body);
  const token = reg.body.data.sessionToken;

  // 2. Add item
  const add = await request('/api/cart/items', 'POST', { 'x-session-token': token }, {
    productId: 'p_kbd',
    name: 'RGB Mechanical Keyboard',
    category: 'electronics',
    price: 1299,
    quantity: 1
  });
  console.log('Add status:', add.status, add.body);

  // 3. Clear cart
  const clear = await request('/api/cart', 'DELETE', { 'x-session-token': token });
  console.log('Clear status:', clear.status, clear.body);
}

run().catch(console.error);
