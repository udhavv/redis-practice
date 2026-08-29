import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: process.env.REDIS__PASS,
    socket: {
        host: 'ultrabright-discovery-manifold-63288.db.redis.io',
        port: 16511
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bars

