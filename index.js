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
    const adminCollection = database.collection('admin');


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
console.log(token)
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
    console.log(user)
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
// app.put("/api/users/profile",  verifyToken, async (req, res) => {
//   try {
//     const email = req.user.email;
//     const { name, image } = req.body;

//     const updateDoc = {
//       $set: {
//         name: name,
//         image: image,
//         updatedAt: new Date()
//       }
//     };

//     // যদি আপনার ডেটাবেজে users কালেকশন থাকে
//     const result = await usersCollection.updateOne({ email: email }, updateDoc);

//     res.status(200).json({
//       success: true,
//       message: "Profile updated successfully",
//       result
//     });
//   } catch (error) {
//     console.error("Profile Update Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update profile",
//       error: error.message
//     });
//   }
// });

// const { ObjectId } = require('mongodb');


app.get("/api/users",  async (req, res) => {
  try {
    
    const users = await usersCollection.find().toArray();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users", error: error.message });
  }
});


app.patch("/api/users/role/:id",  async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body; 

    const filter = { _id: new ObjectId(userId) };
    const updateDoc = {
      $set: { role: role }
    };

    const result = await usersCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User role updated successfully" });
  } catch (error) {
    console.error("Update Role Error:", error);
    res.status(500).json({ success: false, message: "Failed to update role", error: error.message });
  }
});

// ৩. ইউজার ডিলিট করার জন্য (DELETE API)
app.delete("/api/users/:id",  async (req, res) => {
  try {
    const userId = req.params.id;

    const query = { _id: new ObjectId(userId) };
    const result = await usersCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user", error: error.message });
  }
});

// সব ট্রানজেকশন ফেচ করার জন্য GET API
// সব ট্রানজেকশন বা পেমেন্ট ফেচ করার জন্য GET API
// সব ট্রানজেকশন বা পেমেন্ট ফেচ করার জন্য GET API
app.get("/api/transactions", async (req, res) => {
  try {
    // পেমেন্ট কালেকশন থেকে সব ট্রানজেকশন নিয়ে আসা
    const payments = await paymentCollection.find().toArray();

    const transactions = await Promise.all(
      payments.map(async (payment) => {
        let userEmail = "N/A";
        const targetId = payment.userId || payment.lawyerId; // userId বা lawyerId যেকোনো একটি হতে পারে

        if (targetId) {
          try {
            let queryId = targetId;
            // যদি _id অবজেক্ট আইডি হয়
            try {
              queryId = new ObjectId(targetId);
            } catch (e) {
              // সাধারণ স্ট্রিং হলে পরিবর্তন করার দরকার নেই
            }

            // প্রথমে userCollection এ খোঁজা
            let person = await usersCollection.findOne({ _id: queryId });
            
            // যদি user না পাওয়া যায়, তবে lawyerCollection এ খোঁজা (যদি তোমার কালেকশন থাকে)
            if (!person && typeof lawyersCollection !== "undefined") {
              person = await lawyersCollection.findOne({ _id: queryId });
            }

            // বিকল্প হিসেবে স্ট্রিং আইডি দিয়ে চেক করা
            if (!person) {
              person = await usersCollection.findOne({ _id: targetId });
              if (!person && typeof lawyersCollection !== "undefined") {
                person = await lawyersCollection.findOne({ _id: targetId });
              }
            }

            if (person && person.email) {
              userEmail = person.email;
            }
          } catch (err) {
            console.error("Error finding user/lawyer email:", err);
          }
        }

        return {
          _id: payment._id,
          transactionId: payment.session_id || payment.transactionId || payment._id,
          userEmail: userEmail,
          amount: payment.price || payment.amount || 0,
          date: payment.date || payment.createdAt || new Date(),
        };
      })
    );

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transactions", error: error.message });
  }
});

// Analytics Overview API Route
app.get("/api/admin/analytics", async (req, res) => {
  try {
    // ১. মোট ইউজার সংখ্যা (usersCollection)
    const totalUsers = await usersCollection.countDocuments();

    // ২. মোট লয়ার সংখ্যা (lawyersCollection)
    const totalLawyers = await lawyersCollection.countDocuments();

    // ৩. মোট হায়ার সংখ্যা (hiringCollection)
    const totalHires = await hiringCollection.countDocuments();

    // ৪. মোট রেভিনিউ হিসাব (paymentCollection থেকে price বা amount যোগ করে)
    const payments = await paymentCollection.find().toArray();
    const totalRevenue = payments.reduce((sum, payment) => {
      const amt = Number(payment.price || payment.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalLawyers,
        totalHires,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Fetch Analytics Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics data", error: error.message });
  }
});

// PATCH: /api/hiring-requests/:id
app.patch('/api/hiring-requests/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;

    // ১. স্ট্যাটাস সঠিক আছে কিনা চেক করুন (accepted বা rejected)
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status value. Use 'accepted' or 'rejected'." 
      });
    }

    // ২. ডেটাবেজে নির্দিষ্ট আইডি দিয়ে রিকোয়েস্ট খুঁজে স্ট্যাটাস আপডেট করুন
    const query = { _id: new ObjectId(requestId) }; // যদি আপনার আইডি ObjectId ফরম্যাটের হয়
    // অথবা আইডি যদি স্ট্রিং হয়: const query = { _id: requestId };

    const updateDoc = {
      $set: {
        status: status,
        updatedAt: new Date()
      }
    };

    const result = await hiringCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Hiring request not found." 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: `Hiring request ${status} successfully`,
      result 
    });

  } catch (error) {
    console.error("Error updating hiring status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});
// POST: /api/reviews (অথবা /api/comments)
// POST: /api/reviews
app.post('/api/reviews', async (req, res) => {
  try {
    const { lawyerId, userEmail, rating, comment } = req.body;

    // ১. চেক করুন এই ইউজার এই লয়ারকে হায়ার করেছে কি না
    const hiringRecord = await hiringCollection.findOne({
      clientEmail: userEmail,
      lawyerId: lawyerId,
      status: "approved" // বা আপনার অ্যাপ্রুভড স্ট্যাটাস
    });

    if (!hiringRecord) {
      return res.status(403).json({ 
        success: false, 
        message: "You must hire this lawyer before leaving a review." 
      });
    }

    // ২. একই হায়ারিং রেকর্ডের ভেতরেই রিভিউ বা কমেন্ট আপডেট করে দিন
    const updateResult = await hiringCollection.updateOne(
      { _id: hiringRecord._id },
      { 
        $set: { 
          rating: Number(rating),
          comment: comment,
          reviewedAt: new Date()
        } 
      }
    );

    res.status(200).json({ success: true, message: "Review added to your hiring record!" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
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
    //     const data= await lawyersCollection.find().skip(skip).limit(limit).toArray();
    //     const { category, search } = req.query;
    //     const query = {};
    //     if (category) {
    //       query.category = category;
    //     }
    //     if (search) {
    //       query.name = { $regex: search, $options: "i" };
    //     }
    //     // const lawyers = await lawyersCollection.find(query).toArray();
    //   res.send({total_page, skip, page, data});
    //   } catch (error) {
    //     res.status(500).send({ error });
    //   }
    // });

app.get("/api/lawyers", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ১. কুয়েরি অবজেক্ট তৈরি
    const query = {};
    
    // ক্যাটাগরি বা স্পেশিয়ালাইজেশন ফিল্টার (যদি "all" না হয়)
    if (req.query.category && req.query.category !== "all") {
      // ডেটাবেজে ফিল্ডের নাম যদি specialization হয়, তবে এখানে specialization ব্যবহার করতে হবে
      query.specialization = req.query.category; 
    }

    // সার্চ ফিল্টার (নাম বা স্পেশিয়ালাইজেশন উভয়ক্ষেত্রেই খোঁজ করার সুবিধা দিতে পারো)
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { specialization: { $regex: req.query.search, $options: "i" } }
      ];
    }

    // ২. ফিল্টার করা ডেটার ওপর ভিত্তি করে মোট ডেটা এবং পেজ হিসাব
    const total_data = await lawyersCollection.countDocuments(query);
    const total_page = Math.ceil(total_data / limit);

    // ৩. ফিল্টার, স্কিপ ও লিমিট সহ ডেটা ফেচ
    const lawyers = await lawyersCollection
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    // ৪. ডেটা ও পেজিনেশন ইনফো পাঠানো
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
    // const{name}=req.query;

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

// ১. হায়ারিং হিস্ট্রি পাওয়ার API (টোকেন সিকিউরড)
app.get("/api/hiring-requests/:lawyerId", verifyToken, async (req, res) => {
  try {
    const { lawyerId } = req.params;
    const requests = await hiringCollection.find({ lawyerId: new ObjectId(lawyerId) }).toArray();
    res.send(requests);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal Server Error", error });
  }
});

// ২. স্ট্যাটাস আপডেট করার API (টোকেন সিকিউরড)
app.patch("/api/hiring-status/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "accepted" বা "rejected"

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: status } };

    const result = await hiringCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to update status", error });
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
