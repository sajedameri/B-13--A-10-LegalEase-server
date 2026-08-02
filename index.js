// const { ObjectId } = require("mongodb");
// const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { request } = require("http");
const app = express();
app.use(cors({
origin:["http://localhost:3000","https://b-13-a-10-legal-ease.vercel.app"],credentials:true
}));
app.use(express.json());

const uri = process.env.MONGODB_URL;

const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// const JWKS = createRemoteJWKSet(new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`))
 //
 const database = client.db("legalease_db");
    const lawyersCollection = database.collection("lawyers");
    const paymentCollection =database.collection("payment");
    const hiringCollection = database.collection("hiring");
    const usersCollection = database.collection("user")
    const sessionCollection = database.collection('session');


// const verifyToken = (req, res, next) => {

//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).send({
//       success: false,
//       message: "Unauthorized",
//     });
//   }

//   const token = authHeader.split(" ")[1];
//    console.log("Token:", token,req.originalUrl,req.method);

//   if (!token) {
//     return res.status(401).send({
//       success: false,
//       message: "Unauthorized",
//     });
//   }

 

//   next();
// };
const verifyToken = async (req, res, next) => {

    const authHeader = req.headers?.authorization;
    console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const query = { token: token }
    const session = await sessionCollection.findOne(query);

    if (!session) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const userId = session.userId;


    const userQuery = {
        _id: userId
    }

    const user = await usersCollection.findOne(userQuery);
    if (!user) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    // set data in the req object
    req.user = user;
    next();
}

async function run() {
  try {
   

    app.post("/api/lawyers", async (req, res) => {
      const lawyer = req.body;
      const result = await lawyersCollection.insertOne(lawyer);
      res.send(result);
    });

    

app.post("/api/hiring", verifyToken, async (req, res) => {
  try {
    const { lawyerId, fee } = req.body;

    // Validation
    if (!lawyerId || fee === undefined) {
      return res.status(400).json({
        success: false,
        message: "Lawyer ID and fee are required",
      });
    }

    // ObjectId Validation
    if (!ObjectId.isValid(lawyerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lawyer ID",
      });
    }

   
const userEmail = req.user.email
    // একই user একই lawyer-কে pending অবস্থায় আবার hire করতে পারবে না
    const existingHiring = await hiringCollection.findOne({
      userEmail,
      lawyerId: new ObjectId(lawyerId),
      status: "pending",
    });

    if (existingHiring) {
      return res.status(409).json({
        success: false,
        message: "Hiring request already exists.",
      });
    }

    const hiring = {
      userEmail,
      lawyerId: new ObjectId(lawyerId),
      fee: Number(fee),
      status: "pending",
      lawyerName: lawyer.name,
      paymentStatus: "unpaid",
      createdAt: new Date(),
    };
    console.log(hiring)

    const result = await hiringCollection.insertOne(hiring);

    res.status(201).json({
      success: true,
      message: "Hiring request sent successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Hiring API Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send hiring request.",
      error: error.message,
    });
  }
});
    // payment route

    app.post("/api/payment", async(req,res) =>{
      const {price, userId, title, productId, session_id,email} = req.body;
      const isExistSession = await paymentCollection.findOne({session_id})
      if(isExistSession){
        return res.status(400).send({message:"Session alrady exist"})
      }
      const subs_result = await paymentCollection.insertOne({
       userId,
       session_id,
       price:Number(price) ,
       title,
       productId,
      });
      res.send({subs_result});
    });

    // Get Hiring History for User (by Email)
   
    // Update User Profile Route
app.put("/api/users/profile",  verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, image } = req.body;

    const updateDoc = {
      $set: {
        name: name,
        image: image,
        updatedAt: new Date()
      }
    };

    // যদি আপনার ডেটাবেজে users কালেকশন থাকে
    const result = await usersCollection.updateOne({ email: email }, updateDoc);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      result
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
});

// ১. লগইন করা ইউজারের সমস্ত কমেন্ট পাওয়ার জন্য রাউট
app.get("/api/comments/user",  verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const comments = await commentsCollection.find({ userEmail: userEmail }).toArray();
    res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error("Fetch Comments Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch comments", error: error.message });
  }
});

// ২. নির্দিষ্ট কমেন্ট আপডেট (Edit) করার জন্য রাউট
app.put("/api/comments/:id", verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const { commentText } = req.body;
    const userEmail = req.user.email;

    const filter = { _id: new ObjectId(commentId), userEmail: userEmail };
    const updateDoc = {
      $set: {
        commentText: commentText,
        updatedAt: new Date()
      }
    };

    const result = await commentsCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Comment not found or unauthorized" });
    }

    res.status(200).json({ success: true, message: "Comment updated successfully" });
  } catch (error) {
    console.error("Update Comment Error:", error);
    res.status(500).json({ success: false, message: "Failed to update comment", error: error.message });
  }
});

// ৩. নির্দিষ্ট কমেন্ট ডিলিট (Delete) করার জন্য রাউট
app.delete("/api/comments/:id",  verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userEmail = req.user.email;

    const query = { _id: new ObjectId(commentId), userEmail: userEmail };
    const result = await commentsCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Comment not found or unauthorized" });
    }

    res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete comment", error: error.message });
  }
});

    // get api query manege profiel page
    app.get("/api/my/lawyers", async (req, res) => {
      const query = {};
      console.log(req.query.email);
      if (req.query.email) {
        query.email = req.query.email;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const cursor = lawyersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
// get id route
//  app.get('/api/lawyers/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     // এখানে MongoDB থেকে lawyer খুঁজবে
//     const lawyer = await lawyersCollection.findOne({
//       _id: new ObjectId(id),
//     });

//     if (!lawyer) {
//       return res.status(404).json({
//         success: false,
//         message: 'Lawyer not found',
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: lawyer,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });


    // getFeatured Lawyers
    app.get("/api/lawyers/featured", async (req, res) => {
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
    // app.get("/api/lawyers", async (req, res) => {
    //   try {
    //     const limit = Number( req.query.limit) || 10
    //     const  page = Number(req.query.page) || 1;
    //     const total_data = await lawyersCollection.countDocuments()
    //     const total_page = Math.ceil(total_data/limit)
    //     const skip = (page - 1)* limit
    //     const result = await lawyersCollection.find().skip(skip).limit(limit).toArray();
    //     const { category, search } = req.query;
    //     const query = {};
    //     if (category) {
    //       query.category = category;
    //     }
    //     if (search) {
    //       query.name = { $regex: search, $options: "i" };
    //     }
    //     const lawyers = await lawyersCollection.find(query).toArray();
    //   res.send(layers);
    //   } catch (error) {
    //     res.status(500).send({ error });
    //   }
    // });

    // api pasinetion added
    app.get("/api/lawyers", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ১. প্রথমে কুয়েরি অবজেক্ট তৈরি করুন
    const query = {};
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    // ২. ফিল্টার করা ডেটার ওপর ভিত্তি করে মোট ডেটা এবং পেজ হিসাব করুন
    const total_data = await lawyersCollection.countDocuments(query);
    const total_page = Math.ceil(total_data / limit);

    // ৩. ফিল্টার, স্কিপ ও লিমি트 সহ ডেটা ফেচ করুন
    const lawyers = await lawyersCollection
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    // ৪. ডেটা ও পেজিনেশন ইনফো একসাথে পাঠAও
    res.send({
      lawyers,
      total_data,
      total_page,
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});


    app.get("/api/hiring",verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    const{name}=req.query;

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await hiringCollection
      .find({ userEmail: email })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});
    // get api route id
    app.get('/api/lawyers/:id', async (req, res) =>{
  const id = req.params.id;
  const query = {
    _id: new ObjectId(id)
    
  }
  
  const result =await lawyersCollection.findOne(query);
  res.send(result);
})
// 2. Send Hiring Request (Authenticated User Route)




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send({ message: "Welcome to the server" });
});

app.listen(port, () => {
  console.log(`server running ${port}`);
});
