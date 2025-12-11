const express = require("express");
const session = require("express-session");
const serverless = require("serverless-http");

const app = express();


app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "ctf-secret-change-me",
    resave: false,
    saveUninitialized: false,
  })
);

const users = [
  { id: 1, username: "alice", password: "password", displayName: "Alice" },
  { id: 2, username: "admin", password: "SuperSecretAdminPw!", displayName: "Admin" },
];

const notes = [
  { id: 1, ownerId: 1, title: "Alice's shopping list", body: "Milk, bread, eggs." },
  {
    id: 2,
    ownerId: 2,
    title: "Admin Secret",
    body: "FLAG{BROKEN_ACCESS_CONTROL_EXAMPLE}",
  },
];


function getCurrentUser(req) {
  if (!req.session.userId) return null;
  return users.find((u) => u.id === req.session.userId) || null;
}

function requireLogin(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.redirect("/login");
  }
  req.user = user;
  next();
}


app.get("/", (req, res) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.send(`
      <h1>Broken Access Control CTF</h1>
      <p>You must log in to view your notes.</p>
      <p>Credentials for the challenge user:</p>
      <pre>username: alice
password: password</pre>
      <a href="/login">Go to login</a>
    `);
  }

  const userNotes = notes.filter((n) => n.ownerId === user.id);
  const listItems = userNotes
    .map((n) => `<li><a href="/notes/${n.id}">${n.title}</a></li>`)
    .join("");

  res.send(`
    <h1>Welcome, ${user.displayName}</h1>
    <p>Your goal: Find the hidden FLAG note by exploring the application.</p>
    <h2>Your notes</h2>
    <ul>
      ${listItems || "<li>(You have no notes)</li>"}
    </ul>
    <p><a href="/logout">Logout</a></p>
  `);
});

app.get("/login", (req, res) => {
  res.send(`
    <h1>Login</h1>
    <form method="POST" action="/login">
      <label>Username: <input name="username" /></label><br />
      <label>Password: <input name="password" type="password" /></label><br />
      <button type="submit">Login</button>
    </form>
    <p><a href="/">Back home</a></p>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.send(`
      <h1>Login failed</h1>
      <p>Invalid credentials.</p>
      <p><a href="/login">Try again</a></p>
    `);
  }

  req.session.userId = user.id;
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


app.get("/notes/:id", requireLogin, (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  const note = notes.find((n) => n.id === noteId);

  if (!note) {
    return res.status(404).send(`
      <h1>Note not found</h1>
      <p>No note with ID ${noteId}.</p>
      <p><a href="/">Back</a></p>
    `);
  }

  res.send(`
    <h1>${note.title}</h1>
    <pre>${note.body}</pre>
    <p>Note ID: ${note.id}</p>
    <p>Owner ID (for debugging): ${note.ownerId}</p>
    <p><a href="/">Back</a></p>
  `);
});



// For Vercel, export a handler using serverless-http
module.exports = serverless(app);

// For local dev: `node api/index.js`
if (require.main === module) {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`CTF app listening on http://localhost:${PORT}`);
  });
}