const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000
const ObjectId = require('mongodb').ObjectId

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ukthn.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

async function run() {
  try {
    await client.connect()

    const bikePartsCollection = client
      .db('bikerz_heaven')
      .collection('bikeParts')
    const ordersCollection = client.db('bikerz_heaven').collection('orders')

    app.get('/', (req, res) => {
      res.send('Welcome To Bikerz Heaven Server...')
    })

    // All Bike parts get api
    app.get('/bikeparts', async (req, res) => {
      let query = {}
      const bikeParts = await bikePartsCollection.find(query).toArray()
      res.send(bikeParts)
    })

    // Get single bike part by id
    app.get('/bikeparts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const result = await bikePartsCollection.findOne(query)
      res.send(result)
    })

    // Add new order to database
    app.post('/orders', async (req, res) => {
      const newOrder = req.body.data
      console.log(newOrder)
      const result = await ordersCollection.insertOne(newOrder)
      res.send(result)
    })
  } finally {
    // await client.close()
  }
}
run().catch(console.dir)

app.listen(port, () => {
  console.log(`Bikerz Heaven listening on port ${port}`)
})
