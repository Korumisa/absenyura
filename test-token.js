import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: 'admin-user-id', role: 'ADMIN' },
  'supersecretjwtkey_for_development',
  { expiresIn: '1h' }
);
console.log(token);
