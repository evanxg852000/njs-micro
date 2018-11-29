# Let's build a micro nodejs framework

Frameworks and libraries are great piece of software we rely on to build awesome products. 
As software developers, knowing how they work from the ground up can help us develop better software.
In this three part tutorial series, I will guide you through the implementation of an express like web framework,
While we won't implement all the ins and outs of the [express](https://expressjs.com/) framework, we will implemwnt two of the most important components of a micro framework.
By the of this tutorial, you will have a working framework with features like url routing, midleware support, template engine with inheritance.
as creative as I am, i creatively named the framework `Micro`, sweet name right?

As part of any leaning process, practicing is the best way to master it. I higly encourage you to make to fire up vim, vscode or whatever you are confortable with writting code.

Ready, set, let's go!!!

Some Notes:
- I will be using some ES6 features available in NodeJS, I recomend you to point your [nvm](https://github.com/creationix/nvm) to at least v8.x. 
- Please don't use this as an oportunity to create yet another NodeJS framework, we already have too many of them.
- If you feel like jumping ahead of the article, the full source code is accessible on [github.com](https://github.com/evanxg852000/njs-micro)

In order to build a developer friendly framework, it is in our interest to think of our api, how developer will use the framework. To be honest, with plethora of frameworks dangling around these days, this will be the easiest part of the process. you will have plenty of choice to get inspiration from. in our case we will *closely* reflect the express api. Pardon my noise, I guess this the best time to drop my first code snippet.

```js
const Micro = require('./micro')

const app = new Micro({
    env: 'prod',
    templates: './templates',
    port: 3535
})
```

First of all we import the framework  and instaciate it as `app` passing config parameters: 
- The `env` is the  environement of the application, this will be used by the framework to apply some optisation in case and other magics.
- The `templates` parameter specify the path folder where template files are located in the web application.
- The `port`parameter, well i am sure you guessed that one ...

```js
app.router.all('/', (req, res) => {
    res.end(JSON.stringify({name: 'Micro', version: 'x.y.z'}))
})
```

We access the `router` member of the framework instance to setup a route handler. The method `all` will setup a handler that handles all http verbs (e.i GET, POST, PUT, DELETE). this is great for api landing page that can help test the avaailability status of an API as well as display misc info such as version, vendor etc...


```js
app.route((router) => {

    router.get('/template', (req, res) => {
        let data = {title: 'Home', test:true, items: ['Evan', 'John', 'Jane']}
        res.render('index.html', data)
    })

    // routing with optional parameter
    router.get('/hello/:name?', (req, res) => {
        let name = req.params['name'] || 'world'
        res.end(`Hello ${name}!`)
    })
    
    // route prefixing with group
    router.group('/settings', (router) => {
        router.get('/basic', (req, res) => {
            res.end('Basic Settings')
        })
        
        router.get('/notification', (req, res) => {
            res.end('Notification Settings')
        })

    })

    // exemple of  midleware handler chaining
    router.get('/chain/exemple', [ 
            (req, res, next) => {
                req.chain = 'one ->'
                next()
            }, 
            (req, res, next) => {
                req.chain = `${ req.chain} two ->`
                next()
            }, 
            (req, res) => {
                res.end(`${req.chain} three`)
            }
        ]
    )
})
```

In order to get access to the full router api, the app instance `route` method is the way to go, It will give access to the full app instance router that you can use. Also note the use of the `render` method on the request handler response (`res`) parameter. This is the only api for using our framework template engine. I won't go into the template engine syntax for now. remaining of the snipet shows all you can do with the framework routing comnponent.

Now that we all know how micro is going to be used, we can create our project and start coding. I will assume you can `npm init` with any name for your project; mine is `njs-micro` thgouth. Make sure your project folder is structured like the one bellow.

```
/njs-micro
│   README.md  
│
└───/src
│   │   index.js
│   │   micro.js
│   │   router.js
│   │   templater.js
│   │
└───/test
│   │   ...
│   
└───/templates
    │   index.html
    │   main.html
```

- `project/src` : all the core source file will live here
    - `project/src/index.js`: The try-it-out file, where we use our framework api (this is not unit)
    - `project/src/micro.js`: The core framework file
    - `project/src/router.js`: The router component of the framework
    - `project/src/templater.js`: The template component of the framework
- `project/templates/` : The templates file will reside here while developing, remember this is configurable for users of the framework.
- `project/templates/test/` : The unit test folder, please refer to the [github.com](https://github.com/evanxg852000/njs-micro) as we won't cover this in this series.

Now open `project/src/micro.js` and let's code the core class of our micro framework. 

```js
const http = require('http')
const Router = require('./router')
const Templater = require('./templater')

class Micro {

    constructor(config = {}){}

    boot(callback){}

    route(fn){}

    _handleRequest(request, response){}

    _patchResponse(response){}

}

```

The imports at the top already show that we will need the NodeJS `http` module as well as our `router.js`, `templater.js` modules. the `Micro` class has few methods that we will decribe and impelement one at a time. the methods startibg with underscore are meant for internal use only. let's implement the constructor.

```js
constructor(config = {}){
    const defaultConfig = {
        env: 'dev',
        port: 3000,
        templates: './templates'
    }
    this.config = Object.assign(defaultConfig, config)

    this._httpServer = http.createServer(this._handleRequest.bind(this))
    this.router = new Router()
    this.templater = new Templater(
        this.config.templates, 
        this.config.env.toLowerCase().startsWith('prod')
    )
}
```
As you can see, we first create defaults config for the instance and combine with the configuration provided by the instantiator (developer) whlie taking into account that the config from the instantiator take precedence. The next thing we do is create a bare metal NodeJS http server as a member of our Micro class `_httpServer` by passing the `_handleRequest` method and the http request handler. this means everytime our server application receives a request, the `_handleRequest` method of this class will be called. 
The last two things in the constructor take care of instanciating a router and a templater; the templater needs to know the templates folder as well as the application runtime environement for basic optimisation purpose.

Next is the `boot` method that will start the internal http server, some framework might call this run*. here we just call the `listen` method of the NodeJS http server passing the port. the `callback` parameter is checked to make sure it's callable then called with any potential error raised by the http server.

```js
boot(callback){
    this._httpServer.listen(this.config.port, (err) => {
        if(callback && typeof(callback) === 'function'){
            callback(err)
        }
        if (err) {
            return console.log('Micro was not able to start correctly', err)
        }  
        console.log(`Micro server is listening on ${this.config.port}`)
    })
}
```

The last public interface of the Micro class is the route method. This method take a callback parameter as `fn`, cheks if fn is callable then calls it by passing the router. This is how we give access to the router attached to the current framework instance    
can access all the full router api bound to the framework instance.

```js
route(fn){
    if( typeof(fn) !== 'function'){
        return
    }
    return fn(this.router)
}
```

I can feel you asking yourself, how are we giving access to the template engine? That's exactly what we are going to tacle next. 

In the folowing snipet, The nodeJS http handler is implemented as `_handleRequest` by accepting `request` and `response` as parameter. We first call the `_patchResponse` method of the Micro class; then we manually dispatch/forward the request to the router wich is holder all our routes handlers. The router will then decide wich hdnler to call based on what information it finds in the request. 
Calling `this._patchResponse(response)` before dispatcghing is rreally important: by passing the http response, we dynamically create the template rendering function and attach it to the response object before handing over to the dispatch method. This dynamic way of ehancing/modifying and object provided by another system at runtime is called [monkey patching](https://en.wikipedia.org/wiki/Monkey_patch). It's indeed very easy to do dynamic programming languages. 

```js
_handleRequest(request, response){
    // typeof(response.render) -> undefined 
    this._patchResponse(response)
    // typeof(response.render) -> function 
    this.router._dispatch(request, response)
}

_patchResponse(response){
    response.render = (file, context) => {
        try {
            // The only place we access the template engine
            response.end(this.templater.render(file, context))
        } catch (err) {
            // Nobody shows stacktrace to users in production right?
            if(this.config.env.toLowerCase().startsWith('prod')){
                response.statusCode = 500;
                response.end('Internal Server Error')
                return
            }
            response.end(`${err.message} \n ${err.stack}`)
        }
    }
}
```

I am not sure about you but, I believe we have covered a lot for the first part of this serie.
Next time we will explore and implement the router component of our framework. 






