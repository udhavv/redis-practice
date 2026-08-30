import { createClient } from 'redis';

const redis = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'ultrabright-discovery-manifold-63288.db.redis.io',
        port: 16511
    }
});

redis.on('error', err => console.log('Redis Client Error', err));

await redis.connect();

await redis.set('foo', 'bar');
const result = await redis.get('foo');
console.log(result)  // >>> bars

export default redis