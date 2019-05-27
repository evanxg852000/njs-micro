NJS Micro
======

[![Build Status](https://travis-ci.org/evanxg852000/njs-micro.svg)](https://travis-ci.org/evanxg852000/njs-micro)

A NodeJS micro framework for learning and fun.

Introduction
------------

This lightweight web framework will teach you how popular node js frameworks like [express](http://expressjs.com/) are
built. This is not intended for use in an application, this only exist for the purpose of learning how the internals of web frameworks work.

> Please don't use this knowledge to create yet another NodeJS framework, we already have too many of them.

Using (NodeJS Version >= 8)
--------

``` js
const Micro = require('./micro')

const app = new Micro({
    env: 'prod',
    templates: './templates',
    port: 3535
})

app.router.all('/', (req, res) => {
    res.end('Micro ...')
})

app.route((router) => {

    router.get('/template', (req, res) => {
        let data = {title: 'Home', test:true, items: ['Evan', 'John', 'Jane']}
        res.render('index.html', data)
    })

    router.all('/hello/:name?', (req, res) => {
        let name = req.params['name'] || 'world'
        res.end(`Hello ${name}!`)
    })

})

app.boot((err) => {
    console.log('OK');
}) 
```

What's included ?
-----------------

- Request routing
- Request handling via middleware
- Template engine with inheritance

Articles
-----------------

A full step by step process of building this framework is published on my blog.

- [Part I](https://evanxg852000.github.io/tutorial/2019/01/05/lets-build-a-nodejs-micro-framework-part-i.html) 
- [Part II](https://evanxg852000.github.io/tutorial/2019/01/12/lets-build-a-nodejs-micro-framework-part-ii.html)
- [Part III](https://evanxg852000.github.io/tutorial/2019/04/02/lets-build-a-nodejs-micro-framework-part-iii.html)
