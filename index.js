const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')
const app = express()
app.use(cors())
app.use(express.json())

const uri = process.env.MONGODB_URL

const port = process.env.PORT || 5000

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
})

async function run() {
	try {
		const database = client.db('legalease_db')
		const lawyersCollection = database.collection('lawyers')

		app.post('/api/lawyers', async (req, res) => {
			const lawyer = req.body
			const result = await lawyersCollection.insertOne(lawyer)
			res.send(result)
		})

		app.get('/api/lawyers', async (req, res) => {
			try {
				const result = await lawyersCollection.find().toArray()
				res.send(result)
			} catch (error) {
				res.status(500).send({ message: error.message })
			}
		})
		// Send a ping to confirm a successful connection
		await client.db('admin').command({ ping: 1 })
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!',
		)
	} finally {
	}
}
run().catch(console.dir)

app.get('/', async (req, res) => {
	res.send({ message: 'Welcome to the server' })
})

app.listen(port, () => {
	console.log(`server running ${port}`)
})
