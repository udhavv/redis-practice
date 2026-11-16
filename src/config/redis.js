import { createClient } from 'redis';

const redis = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'vest-art-plant-46476.db.redis.io',
        port: 15339
    }
});

redis.on('error', err => console.log('Redis Client Error', err));

await redis.connect();

await redis.set('foo', 'bar');
await redis.set('10', '2');
await redis.set('3', '4');

console.log(await redis.get('foo'));  // >>> bar

console.log(await redis.get('10'))
console.log(await redis.get('3'))
console.log('this is the success11',await redis.get('success11'))
const result = await redis.get('foo');
console.log(result)  // >>> bars

export default redis;











