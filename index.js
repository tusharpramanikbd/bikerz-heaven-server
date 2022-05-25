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

// JWT token verification function
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' })
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' })
    }
    req.decoded = decoded
  })
  next()
}

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

    // ==============================
    // Bike Parts Section
    // ==============================

    // All Bike parts get api
    app.get('/bikeparts', async (req, res) => {
      let query = {}
      const bikeParts = await bikePartsCollection.find(query).toArray()
      res.send(bikeParts)
    })

    // Get single bike part by id
    app.get('/bikeparts/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const result = await bikePartsCollection.findOne(query)
      res.send(result)
    })

    // Add bike parts
    app.post('/bikeparts', verifyJWT, async (req, res) => {
      const newBikeParts = req.body.data
      const bikePartsResult = await bikePartsCollection.insertOne(newBikeParts)
      res.send(bikePartsResult)
    })

    // Delete bike parts by id
    app.delete('/bikeparts/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const filter = { _id: ObjectId(id) }
      const result = await bikePartsCollection.deleteOne(filter)
      res.send(result)
    })

    // =======================
    // Order Section
    // =======================

    // Get all orders
    app.get('/orders', verifyJWT, async (req, res) => {
      const filter = {}
      const orderResult = await ordersCollection.find(filter).toArray()
      res.send(orderResult)
    })

    // Get order list by email
    app.get('/orders', verifyJWT, async (req, res) => {
      const email = req.query.email
      const decodedEmail = req.decoded.email
      if (decodedEmail === email) {
        const filter = { email: email }
        const orderResult = await ordersCollection.find(filter).toArray()
        res.send(orderResult)
      } else {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
    })

    // Add new order to database
    app.post('/orders', verifyJWT, async (req, res) => {
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
    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const filter = { _id: ObjectId(id) }

      // get the order by id before delete
      const order = await ordersCollection.findOne(filter)

      // delete the order
      const result = await ordersCollection.deleteOne(filter)

      // if delete successful
      if (result) {
        const orderQuantity = parseInt(order.orderQuantity)

        // get the product of the deleted order
        const productId = order.productId
        const productFilter = { _id: ObjectId(productId) }
        const product = await bikePartsCollection.findOne(productFilter)

        // add quantity of the deleted order with available quantity
        const availableQuantity = parseInt(product.availableQuantity)
        const updatedQuantity = availableQuantity + orderQuantity

        const options = { upsert: true }
        const updatedDoc = {
          $set: {
            availableQuantity: updatedQuantity.toString(),
          },
        }
        const updateResult = await bikePartsCollection.updateOne(
          productFilter,
          updatedDoc,
          options
        )
      }
      res.send(result)
    })

    // Update order payment status
    app.put('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const updatedOrder = req.body.data
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          payment: updatedOrder.newPaymentStatus,
        },
      }
      const result = await ordersCollection.updateOne(
        filter,
        updatedDoc,
        options
      )
      res.send(result)
    })

    // ============================
    // Review Section
    // ============================

    // add review
    app.post('/reviews', verifyJWT, async (req, res) => {
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

    // get all users
    app.get('/users', verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray()
      res.send(users)
    })

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

    // find a user admin or not
    app.get('/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const user = await usersCollection.findOne({ email: email })
      const isAdmin = user.role === 'admin'
      res.send({ admin: isAdmin })
    })

    // add admin role to user
    app.put('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const filter = { email: email }
      const updatedDoc = {
        $set: { role: 'admin' },
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // =============================
    // User profile section
    // =============================

    // add or update profile
    app.put('/userprofile', verifyJWT, async (req, res) => {
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
    app.get('/userprofile', verifyJWT, async (req, res) => {
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
