const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const faker = require("faker");

mongoose.connect("mongodb://localhost/deivido_januskos", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//Vartotojo schema.
const UserSchema = new Schema({
  name: { type: String },
  surname: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  age: { type: Number }
});
const User = mongoose.model("User", UserSchema);

//Komentaro schema (Embedded dokumentas).
const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  text: { type: String },
  likes: { type: Number }
});

//Post'o schema.
const PostSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  title: { type: String },
  content: { type: String },
  likes: { type: Number },
  comments: [CommentSchema]
});

const Post = mongoose.model("Post", PostSchema);

async function generateData() {
  try {
    let number_of_users = 10;
    let max_num_of_posts = 5;
    let max_num_of_comments = 5;

    let userIDs = [];

    for (let i = 0; i < number_of_users; i++) {
      //Generuojami vartotojų duomenys.
      let userData = {
        name: faker.name.firstName(),
        surname: faker.name.lastName(),
        phone: faker.phone.phoneNumberFormat(),
        email: faker.internet.email(),
        address: faker.address.streetAddress(),
        age: Math.floor(Math.random() * 50) + 20 // 20-69 metai.
      };
      const newUser = new User(userData);
      userIDs.push((await newUser.save())._id);
    }

    for (let i = 0; i < number_of_users; i++) {
      //Generuojami post'ų duomenys.
      let num_of_posts = Math.floor(Math.random() * max_num_of_posts);
      for (let j = 0; j < num_of_posts; j++) {
        //Generuojamas atsitiktinis skaičius post'ų kiekvienam vartotojui.
        let num_of_comments = Math.floor(Math.random() * max_num_of_comments);
        let allComments = [];
        for (let k = 0; k < num_of_comments; k++) {
          //Generuojamas atsitiktinis skaičius komentarų kiekvienam post'ui.
          let commentData = {
            user: userIDs[Math.floor(Math.random() * number_of_users)],
            text: faker.lorem.sentence(),
            likes: Math.floor(Math.random() * 50)
          };
          allComments.push(commentData);
        }
        let postData = {
          user: userIDs[i],
          title: faker.lorem.sentence(Math.floor(Math.random() * 5) + 1),
          content: faker.lorem.paragraph(),
          likes: Math.floor(Math.random() * 100),
          comments: allComments
        };
        const newPost = new Post(postData);
        await newPost.save();
      }
    }
    console.log("Duomenys sugeneruoti sėkmingai.");
  } catch (err) {
    throw err;
  }
}

async function processData() {
  try {
    console.log("1. Ištraukiami + populate'inami visi embedded komentarai:");
    let comments = await Post.find()
      .select("-_id comments")
      .populate("comments.user");
    console.log(JSON.stringify(comments, null, 4));

    console.log("\n2. Agreguojančios užklausos rezultatas:");
    let users = await Post.aggregate([
      {
        $group: {
          _id: "$user",
          likes: { $sum: "$likes" }
        }
      },
      { $sort: { likes: 1 } }
    ]);
    console.log(JSON.stringify(users, null, 4));

    console.log("\n3. map-reduce užklausos rezultatas:");
    let o = {
      map: "function () { emit(this.user, this.likes) }",
      reduce: "function (key, values) { return Array.sum(values) }"
    };
    let likes = (await Post.mapReduce(o)).results;
    likes.sort(function(a, b) {
      return a.value - b.value;
    });
    console.log(JSON.stringify(likes, null, 4));
  } catch (err) {
    throw err;
  }
}

async function main() {
  try {
    //generateData();
    processData();
  } catch (err) {
    console.log(err);
  }
}

main();
