# Part II the router

In today's post, we are going to implement the router class of our Micro framework. as higlighted in part 1 of this series, the router component is implemented into `src/router.js`. 

Our router will be implemented as regular expression matcher behind the scene while providing a higher level of route specification syntaxe. we have already seen some exemples of adding routes in an application using the framework. An important aspect of routing we won't implement in micro is url construction from routes. however this can be an exercise for the active learners.   


So without futher ado, let me show you the squeleton of our router class in its glorified form :).
```js
class Router {

    constructor(){
        this._routes = []
        this._prefix = ''
    }

    route(specs, methods, handlers){ ... }
    group(prefix, fn){ ... }
    all(specs, handlers){ ... }
    _dispatch(request, response){ ... }
    _patternToRegex(pattern){ ... }
    _cleanHandlers(handlers){ ... }

}
```

The listing above show the initialisation of the `_routes`, `_prefix` member variable of the router class to an array and empty string respectively. peharpse the most important method is is the one named `route`.
As you can see this method accepts three argumentsa:
 - The route specification: a higher level of describing regex matching
 - The methods: a list of http methods allowed at this route
 - The handlers: a list of functions that can be called when a request is dispatched to this route

Our objective in this method is to build a route object and add it to the `_routes` array member variable. In order to simplify and harmonise our explanation, let's suppose we call the route method the following way:

` router.route('/:class/students/:id/:session?', ['GET', 'POST'], [ _ => true, _ => false]) `

our `_routes` member variable should end up with the folowwing content:

```js
[{ 
    methods: [ 'GET', 'POST' ],
    regex: /^\/([_a-zA-Z0-9\-]+)\/students\/([_a-zA-Z0-9\-]+)(\/([_a-zA-Z0-9\-]+))?$/,
    params: [ 'class', 'id', 'session' ],
    handlers: [ [Function], [Function] ] }
}]
```
Please notice how the route object info we need are all available. the `methods`, handlers properties are easy to map, because they are just direct assignment from the actual parameters received from the call to `router.route(...)`. In order to understand the remaining properties, let implement the `route`, `group` methods of the router class.

```js
class Router {
    ...
    
    route(specs, methods, handlers){
        if(this._prefix !== ''){
            specs = `${this._prefix}/${specs}`
        }
        handlers = this._cleanHandlers(handlers)
        this._routes.push({ 
            methods,
            ...this._patternToRegex(specs),
            handlers
        })
    }

    group(prefix, fn){
        this._prefix = prefix
        fn(this)
        this._prefix = ''
    }

    all(specs, handlers){
        this.route(specs, ['GET', 'POST', 'PUT', 'DELETE'], handlers)
    }

    ...
}

```

In the `route` method, we first check if `_prefix` is not empty then tweak the specs parameter accordingly by prefixing it.
Then we call `_cleanHandlers` helper method to validate the request handlers to make sure they are callable. This helper method also converts single handler into an array.
Next we push into the `_routes` member variable a newly created route object, the extraction of the `params` and `regex` properties of the route happend in the call and spread operation ` ...this._patternToRegex(specs)`. before looking into the implementation of this helper method though,
let's finish details of remaining methods above. 

The group method accepts a prefix and a callback function, It assignes the prefix to the `_prefix` and invoke the callback passing the instance of the router. The `_prefix` is reset to an empty string after the callback invocation.
This technique is a good way of maintaining the router prefix while the routes are being created in the callback, consequently any route created in the callback will endup with the current value of `_prefix`.

the `all` method is one of the many router api methods that allow users of our framework to add routes without listing the http methods manually.
these methods are: get, post, put, delete.

Now that all these noisy methods are out of the way, let focus on the most important methods of our router class: 
- _patternToRegex(specs) 
- _dispatch(request, response)

The `_patternToRegex(specs) `, converts route specification to regular expression. To be honest it should be named `_specsToRegex`, I was not willing to change it by any means. This is just a toy project right? let's not waste time on this matter and show the implementation this method.

```js
class Router {
    ...

   _patternToRegex(pattern){
        let regex = ''
        let params = []
        let parts = pattern.split('/')
        for(let part of parts){
            if(part.trim() === '')
                continue
            if(part.startsWith(':')){
                if(part.endsWith('?')){
                    regex += '(/([_a-zA-Z0-9\\-]+))?' 
                } else {
                    regex += '/([_a-zA-Z0-9\\-]+)'
                }
                params.push(part.replace(/(\?|:)/g, ''))
                continue
            }
            regex += `/${part}`
        }
        // Handle special case (web root)
        if(regex === ''){
           regex = '/'  
        }
        regex = new RegExp(`^${regex}$`)
        return {regex , params}
    }

    ...
}
```
In this method, we first initilise the `regex`, `params` to an empty string and empty array respectively; next we break the specification(`pattern`) into parts and construct each part as a small part of the regular expression that will be generated. 
Looping through the parts, we skip empty part that takes into account trailing forward slash `/`. 
Next we check if this part is a route parameter (does it starts with `:`). If yes, we construct a simple regular expression that accepts characters allowed in a url while taking into account the optional specifier `?`. Otherwise, we just add the part to the regular expression. Please note how we add the name of the route parameter by cleaning it and pushing into the `params` array.
finally we create a javascript RegExp object from our generate `regex` string and return an object made of the regular expression object and the route parameter names array.

The last bit we need to tackle in this `Router` class is the `_dispatch` method. if you recall from [part 1](http://), this is the method that is called in order to find the appropriated request handler to process a http request targetting our micro framework app instance. This method is tricky one though. here is the listing of the dispatch method.

```js
class Router {
    ...

    _dispatch(request, response){
        let match, handledRequest = false, {url} = request
        for(let route of this._routes){
            // 1- Keep trying  till we find a match 
            match = url.match(route.regex)
            if(match === null || !route.methods.includes(request.method)){
                continue
            }

            // 2- Collect route params value when match found 
            match = match.filter(item => {
                return !item || !item.startsWith('/')
            })
            request.params = route.params.reduce((obj, param, idx) => {
                obj[param] = match[idx]
                return obj
            }, {})

            // 3- Create handler chain and start processing request
            let nextHandler
            const handlerStack = route.handlers.slice().reverse()
            const params = Object.values(request.params)
            for(const handler of handlerStack){
                let lastNext = nextHandler
                const next = () => {
                    handler(request, response, lastNext, ...params)
                }
                nextHandler = next
            }
            nextHandler()
            handledRequest = true
            break;
        }

        if(handledRequest){
            return
        }
        response.statusCode = 404;
        response.end("Not Found !")
    }

    ...
}

```

In this method, we will receive the nodejs http server request and response object as parameters. recall from part one that the response was patched with new method called `render` from the purpose of template rendering. In the above listing, we essentially do three things:

First, we try to find a matching route based on the request url property. if not match is found we simple reply with a 404 http status code, meaning the requested ressource was not found.
Second, if a match is found we try to extract all the route params value from the matching url and map them to the params name. we use the regular expression captured groups to ignore those with value undefined or starts with slash `/`. then we loop through `params` names to build a key/value mapping between the names and the values that we finally assings to `request.params` . Making our second act of patching the NodeJS http server object.

At last, we need to build a chain of handlers out of the matched route handlers array. again recall from this snippet taken from [part 1]()

```js
    router.get('/chain/exemple', [ 
            (req, res, next) => {
                req.chain = 'one ->'
                next()
            }, 
            (req, res, next) => {
                req.chain = `${ req.chain} two ->`
                next()
            }, 
            (req, res, next) => {
                res.end(`${req.chain} three`)
                // next -> udefined thus cannot be called
            }
        ]
    )
```
here for the next handler to be invoked, we need to explicitly call the `next` argument received in the route handler. 
In order to achieve this, we will have to embed our handlers inside each other and endup with the first handler being top level handler. basically we will go from an array of handlers to a russian dolls like data structure. this data structure is a special kind of tree where each node has one or zero child. 

Since Words < Images < Videos : [Russian Dolls](https://www.youtube.com/watch?v=-xMYvVr9fd4)

To make this easier we adop a bottom up approach by building the last handler first that will be embeded into the first to last handler which in  turn will... and so on. Since we need to start building our handler chain from the last handler, we copy and reverser the handlers from the matched route `const handlerStack = route.handlers.slice().reverse()`. It's important to make a copy as this chain is built specically for the current http request being processed. We loop through the reversed handlers array `handlerStack`. In the first iteration, `nextHandler` is `undefine`. This makes sence because inside the last handler, the `next` parameter should be `undefined` as there is no subsequent handler in the chain. We first declare `lastNext` and assigns it the value of `nextHandler`. After that we need to encapsulate the current handler in the form of `next`. Notice how we are passing inside the all the current request data we need `handler(request, response, lastNext, ...params)` as well as the previously constructed `next` handler in the form of `lastNext`. We also remember to reset nextHandler via this assignement expression `nextHandler = next`. Once outside of the loop, `nextHandler` is a function pointing to the root of the handler chain. In other word, this is the biggest russian doll that encapsulates the remaining onces. The only thing we need to do here is to invoke that top level handler and mark the request as successfully handled `handledRequest = true`.


Ultimately, a production grade router will need more validation as well as a way to name routes for easier url generation. however what is implemented here demonstrated mostly how a router is can be implemented.
 

