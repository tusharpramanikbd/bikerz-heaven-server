const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
const jwt = require('jsonwebtoken')
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
    const reviewsCollection = client.db('bikerz_heaven').collection('reviews')
    const usersCollection = client.db('bikerz_heaven').collection('users')
    const usersProfileCollection = client
      .db('bikerz_heaven')
      .collection('usersProfile')

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

    // =======================
    // Order Section
    // =======================

    // Get order list by email
    app.get('/orders', async (req, res) => {
      const email = req.query.email
      const filter = { email: email }
      const orderResult = await ordersCollection.find(filter).toArray()
      res.send(orderResult)
    })

    // Add new order to database
    app.post('/orders', async (req, res) => {
      const newOrder = req.body.data
      const newOrderResult = await ordersCollection.insertOne(newOrder)

      // Getting available quantity from seleted product
      const productId = newOrder.productId
      const filter = { _id: ObjectId(productId) }
      const bikePartResult = await bikePartsCollection.findOne(filter)
      const availableQuantity = bikePartResult.availableQuantity

      // Creating updated quantity
      const updatedQuantity =
        availableQuantity - parseInt(newOrder.orderQuantity)

      // Updating available quantity
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          availableQuantity: updatedQuantity,
        },
      }
      const updateQuantityResult = await bikePartsCollection.updateOne(
        filter,
        updatedDoc,
        options
      )
      res.send(updateQuantityResult)
    })

    // Delete order by id
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: ObjectId(id) }
      const result = await ordersCollection.deleteOne(filter)
      res.send(result)
    })

    // ============================
    // Review Section
    // ============================

    // add review
    app.post('/reviews', async (req, res) => {
      const newReview = req.body.data
      const reviewResult = await reviewsCollection.insertOne(newReview)
      res.send(reviewResult)
    })

    // get all review
    app.get('/reviews', async (req, res) => {
      let query = {}
      const reviews = await reviewsCollection.find(query).toArray()
      res.send(reviews)
    })

    // ===============================
    // User section
    // ===============================

    // add user to database
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body.currentUser
      const filter = { email: email }
      const options = { upsert: true }
      const updatedDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      )
      const accessToken = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: '1d',
        }
      )
      res.send({ result, accessToken })
    })

    // =============================
    // User profile section
    // =============================
    // add or update profile
    app.put('/userprofile', async (req, res) => {
      const newProfile = req.body.data
      const filter = { email: newProfile.email }
      const options = { upsert: true }
      const updatedDoc = {
        $set: newProfile,
      }
      const profileResult = await usersProfileCollection.updateOne(
        filter,
        updatedDoc,
        options
      )
      res.send(profileResult)
    })

    // Get profile by email
    app.get('/userprofile', async (req, res) => {
      const email = req.query.email
      const filter = { email: email }
      const profileResult = await usersProfileCollection.findOne(filter)
      res.send(profileResult)
    })
  } finally {
    // await client.close()
  }
}
run().catch(console.dir)

app.listen(port, () => {
  console.log(`Bikerz Heaven listening on port ${port}`)
})
