const Micro = require("./micro")

const app = new Micro({
  env: "prod",
  templates: "./templates",
  port: 3535,
})

app.router.all("/", (req, res) => {
  res.end("Micro ...")
})

app.route(router => {
  router.get("/template", (req, res) => {
    let data = { title: "Home", test: true, items: ["Evan", "John", "Jane"] }
    res.render("index.html", data)
  })

  router.all("/hello/:name?", (req, res) => {
    let name = req.params["name"] || "world"
    res.end(`Hello ${name}!`)
  })
})

app.boot(err => {
  console.log("OK")
})
