const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.json());

/* =====================
   SERVE FRONTEND
===================== */
app.use(express.static(path.join(__dirname, "public")));

const DB_FILE = "./db.json";

/* =====================
   DB
===================== */
function readDB(){
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* =====================
   REGISTER
===================== */
app.post("/register", (req, res) => {

  const db = readDB();

  const { name, email, password } = req.body;

  if(!name || !email || !password){
    return res.json({
      ok:false,
      msg:"Completa todos los campos"
    });
  }

  const exists = db.users.find(u => u.email === email);

  if(exists){
    return res.json({
      ok:false,
      msg:"Usuario ya existe"
    });
  }

  const otp = Math.floor(100000 + Math.random()*900000).toString();

  db.pending.push({
    name,
    email,
    password,
    otp
  });

  writeDB(db);

  console.log("OTP:", otp);

  res.json({
    ok:true,
    msg:"OTP enviado"
  });

});

/* =====================
   VERIFY OTP
===================== */
app.post("/verify", (req, res) => {

  const db = readDB();

  const { email, code } = req.body;

  const pending = db.pending.find(p => p.email === email);

  if(!pending){
    return res.json({
      ok:false,
      msg:"Registro no encontrado"
    });
  }

  if(pending.otp !== code){
    return res.json({
      ok:false,
      msg:"Código incorrecto"
    });
  }

  const user = {
    id: Date.now().toString(),
    name: pending.name,
    email: pending.email,
    password: pending.password,
    online:false
  };

  db.users.push(user);

  db.pending = db.pending.filter(p => p.email !== email);

  writeDB(db);

  res.json({
    ok:true,
    msg:"Cuenta verificada"
  });

});

/* =====================
   LOGIN
===================== */
app.post("/login", (req, res) => {

  const db = readDB();

  const { email, password } = req.body;

  const user = db.users.find(u =>
    u.email === email &&
    u.password === password
  );

  if(!user){
    return res.json({
      ok:false,
      msg:"Credenciales incorrectas"
    });
  }

  user.online = true;

  writeDB(db);

  res.json({
    ok:true,
    user
  });

});

/* =====================
   USERS
===================== */
app.get("/users", (req, res) => {

  const db = readDB();

  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    online: u.online
  }));

  res.json(users);

});

/* =====================
   SOCKET
===================== */
const onlineUsers = {};

io.on("connection", (socket) => {

  socket.on("join", (user) => {

    onlineUsers[user.id] = socket.id;

    const db = readDB();

    const found = db.users.find(u => u.id === user.id);

    if(found){
      found.online = true;
      writeDB(db);
    }

    io.emit("users_update");

  });

  socket.on("message", (msg) => {

    const targetSocket = onlineUsers[msg.to];

    if(targetSocket){
      io.to(targetSocket).emit("message", msg);
    }

    socket.emit("message", msg);

  });

  socket.on("disconnect", () => {

    const db = readDB();

    Object.keys(onlineUsers).forEach(userId => {

      if(onlineUsers[userId] === socket.id){

        delete onlineUsers[userId];

        const found = db.users.find(u => u.id === userId);

        if(found){
          found.online = false;
        }

      }

    });

    writeDB(db);

    io.emit("users_update");

  });

});

/* =====================
   START
===================== */
server.listen(3000, () => {
  console.log("Skyline backend running on port 3000");
});
