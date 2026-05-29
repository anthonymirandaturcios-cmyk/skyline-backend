const API = window.SKYLINE_CONFIG.API;
const socket = io(API, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

let me = JSON.parse(localStorage.getItem("skyline_user")) || null;
let currentChat = null;

/* =====================
   NAV
===================== */
function show(id){
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showRegister(){ show("registerScreen"); }
function showLogin(){ show("loginScreen"); }

/* =====================
   AUTO LOGIN
===================== */
window.onload = () => {
  if(me){
    socket.emit("join", me);
    userInfo.innerText = me.name;
    loadUsers();
    show("homeScreen");
  }
};

/* =====================
   REGISTER
===================== */
async function register(){
  const name = regName.value;
  const email = regEmail.value;
  const password = regPassword.value;
  const confirm = regConfirm.value;

  if(password !== confirm){
    alert("Contraseñas no coinciden");
    return;
  }

  const res = await fetch(API+"/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,email,password})
  });

  const data = await res.json();

  if(!data.ok) return alert(data.msg);

  otpEmail.value = email;
  show("otpScreen");
}

/* =====================
   VERIFY OTP
===================== */
async function verifyOTP(){
  const res = await fetch(API+"/verify",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      email: otpEmail.value,
      code: otpCode.value
    })
  });

  const data = await res.json();

  if(!data.ok) return alert(data.msg);

  alert("Cuenta verificada");
  show("loginScreen");
}

/* =====================
   LOGIN (REAL SESSION)
===================== */
async function login(){
  const res = await fetch(API+"/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      email: loginEmail.value,
      password: loginPassword.value
    })
  });

  const data = await res.json();

  if(!data.ok) return alert(data.msg);

  me = data.user;

  localStorage.setItem("skyline_user", JSON.stringify(me));

  socket.emit("join", me);

  userInfo.innerText = me.name;

  loadUsers();
  show("homeScreen");
}

/* =====================
   USERS
===================== */
async function loadUsers(){
  const res = await fetch(API+"/users");
  const users = await res.json();

  usersList.innerHTML = "";

  users.forEach(u => {
    if(me && u.id === me.id) return;

    const div = document.createElement("div");
    div.className = "chat";
    div.innerHTML = `
      <b>${u.name}</b>
      <small>${u.online ? "🟢 online" : "⚪ offline"}</small>
    `;

    div.onclick = () => openChat(u);

    usersList.appendChild(div);
  });
}

/* =====================
   CHAT
===================== */
function openChat(user){
  currentChat = user;

  chatUser.innerText = user.name;

  chatBox.innerHTML = "";

  show("chatScreen");

  socket.emit("open_chat", {
    from: me.id,
    to: user.id
  });
}

function backHome(){
  show("homeScreen");
}

/* =====================
   SEND MESSAGE
===================== */
function sendMsg(){
  const text = msgInput.value.trim();
  if(!text || !currentChat) return;

  socket.emit("message",{
    from: me.id,
    to: currentChat.id,
    text
  });

  msgInput.value = "";
}

/* =====================
   RECEIVE MESSAGE
===================== */
socket.on("message",(msg)=>{
  const div = document.createElement("div");

  div.className = msg.from === me.id ? "msg me" : "msg them";
  div.innerText = msg.text;

  chatBox.appendChild(div);

  chatBox.scrollTop = chatBox.scrollHeight;
});

/* =====================
   USERS LIVE UPDATE
===================== */
socket.on("users_update", loadUsers);

/* =====================
   DISCONNECT HANDLING
===================== */
socket.on("disconnect", () => {
  console.log("Reconectando...");
});

socket.on("connect", () => {
  if(me) socket.emit("join", me);
});
