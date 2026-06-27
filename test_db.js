const mongoose = require('mongoose');
const User = require('./src/models/User');
const Cart = require('./src/models/Cart');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/cart_engine');
  console.log('Connected to MongoDB');
  const users = await User.find();
  console.log('Users:', users.map(u => ({ username: u.username, token: u.sessionToken })));
  const carts = await Cart.find();
  console.log('Carts:', carts.map(c => ({ userId: c.userId, items: c.items, status: c.status })));
  await mongoose.disconnect();
}

test().catch(console.error);
