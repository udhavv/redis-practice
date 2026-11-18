import redis from "./src/config/redis";


const user= {
    id: '1001',
    name: 'uddhav',
    email: 'auddhav098@gmail.com'
}


await redis.set(userdata, JSON.stringify(user))

const data= await redis.get(userdata)
console.log('this is the redis data:- ', data)

// or i can put the entire object in a single way without using stringify, redis.hSet