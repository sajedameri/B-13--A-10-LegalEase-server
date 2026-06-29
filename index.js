const express = require ('express')
// const cors = require ('cors');
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config();
// app.use(cors());
// app.use(express.json());
const uri = process.env.MONGODB_URL;
const app = express()
const PORT = process.env.PORT 

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


      const database = client.db("legalease_db");
    const lawyersCollection = database.collection("lawyers");

    app.post('/api/lawyers',async(req, res)=>{
      const lawyer =req.body;
      const result = await lawyersCollection.insertOne(lawyer);
      res.send(result);
    })


//     app.get("/api/lawyers", async (req, res) => {
//   try {
//     const result = await lawyersCollection.find().toArray();

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({ message: error.message });
//   }
// });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, ()=>{
  console.log(`server running ${PORT}`)
})