const dotenv = require('dotenv')
dotenv.config()
const dns= require("dns")
dns.setServers(["8.8.8.8","1.1.1.1"])

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

    // get api query manege profiel page
 app.get('/api/lawyers', async(req, res) =>{
  const query = {};
  if(req.query.userId){
    query.userId = req.query.userId;
  }
  if(req.query.status){
    query.status = req.query.status;
  }
  const cursor = lawyersCollection.find(query);
  const result = await cursor.toArray();
  res.send(result)
 }) 	
// getFeatured Lawyers
		app.get('/api/lawyers/featured', async (req, res) => {
  try {
    const lawyers = await lawyersCollection
      .aggregate([
        {
          $sample: {
            size: 6,
          },
        },
      ])
      .toArray(); 

    res.send(lawyers);
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});
// Top Legal Expert
app.get("/api/lawyers/top-experts", async (req, res) => {
  try {
    const lawyers = await lawyersCollection
      .find({})
      .sort({ hireCount: -1 })
      .limit(3)
      .toArray();

    res.send(lawyers);
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});

// catagory
app.get("/api/lawyers", async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    const lawyers = await lawyersCollection.find(query).toArray();

    res.send(lawyers);
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});


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
