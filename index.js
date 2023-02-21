const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster-1.yey930g.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri);

const verifyJWT = (req, res, next) => {
  // check if authorization header exists
  const authorizationHeader = req.headers.authorization; // result: `Bearer hereYourTokenFromClientSide`
  // if no authorization header sent during api call
  if (!authorizationHeader) {
    return res.status(401).send({message: "Unauthorized Access"});
  }
  const token = authorizationHeader.split(" ")[1];
  // verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // if error happens during verification
    if (err) {
      return res.status(401).send({message: "Unauthorized Access"});
    }

    // decoded payload
    req.decoded = decoded;
    // next means the next handler function in the api
    next();
  });
};

async function run() {
  try {
    const servicesCollection = client.db("geniusCar").collection("services");
    const ordersCollection = client.db("geniusCar").collection("orders");

    // receive user data after login
    app.post("/jwt", (req, res) => {
      const user = req.body;

      // create token for the user
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // send token to client side
      res.send({ token });
    });

    // get services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // get a service
    app.get("/services/:id", async (req, res) => {
      const service_id = req.params.id;
      const query = { service_id };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });

    // get all orders or filter by email
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decoded = req.decoded;

      // if decoded email and qurey email is not same
      if (decoded.email !== email) {
        return res.status(403).send({message: "Access Forbidden"});
      }

      let query = {};
      if (email) {
        query = { email };
      }
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    // create an order
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    // update an order
    app.patch("/orders/:service_id", async (req, res) => {
      const service_id = req.params.service_id;
      const status = req.body.status;
      const filter = { service_id };
      const updateOrder = {
        $set: {
          status: status,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateOrder);
      res.send(result);
    });

    // delete an order
    app.delete("/orders/:service_id", async (req, res) => {
      const service_id = req.params.service_id;
      const query = { service_id };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    //
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("test");
});

app.listen(port, () => {
  console.log(`Server is running in port ${port}`);
});
