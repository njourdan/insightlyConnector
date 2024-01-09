require('dotenv').config()
const fs = require('fs/promises');
const fastify = require('fastify')({
    logger: true
  })



  async function getJSON(filePath){
    return fs.readFile(filePath).then(file => JSON.parse(file));
  }
  
  async function saveJSON(filePath,data){
    fs.writeFile(filePath,JSON.stringify(data,null,2))
  }




  async function getSubscribersFromBigCommerce(page){
    let BASE_URL = `https://api.bigcommerce.com/stores/${process.env.STORE_HASH}/v3/customers/subscribers`;
    console.log(BASE_URL)
    if(page && page !== 1){
      BASE_URL += `?page=${page}`
    }

    const headers = {
      Accept : 'application/json',
      'Content-Type' : 'application/json',
      'X-Auth-Token': process.env.BIG_COMMERCE_AUTH_TOKEN
    }

    return fetch(BASE_URL, {
      method: 'GET',
      headers: headers
    })
    .then(response => response.json())

  }

  async function getAllSubscribers(offset){
    let allSubscribers = [];
    let currentList
    let page = 1 + offset;
    
    let shouldRun = () => page > 1 && Array.isArray(currentList) && currentList.length > 0;


    while(page === 1 + offset || shouldRun()) {

      let subscribers = await getSubscribersFromBigCommerce(page);
      console.log(subscribers)
      currentList = subscribers.data;
      allSubscribers.push(subscribers.data)
      page++
      
    }

    allSubscribers = allSubscribers
    .flat()
    .map(subscriber => subscriber.email)
    return {allSubscribers,page}
  }
  

  async function getNewEmails(){
    let config = await getJSON("./config.json");
    let offset = config.offset;

    let insightlyList = await getJSON('./sentToInsightly.json');

    let {allSubscribers,page}= await getAllSubscribers(offset);

    let newEmails = allSubscribers.filter(email=>!insightlyList.includes(email))
    
    saveJSON("./config.json",{offset:page-2})
    saveJSON('./sentToInsightly.json',[...new Set([insightlyList,newEmails].flat())])

    return newEmails
  }




  fastify.get('/', async function (request, reply) {

    let newEmails = getNewEmails();
    reply.send(newEmails)
    

  })
  
  // Run the server!
  fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    // Server is now listening on ${address}
  })