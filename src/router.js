
class Router {

    constructor(){
        this._routes = []
        this._prefix = '' 
        // var aroute = {
        //     methods: ['GET', 'POST', 'PUT', 'DELETE'],   
        //     patern: /{}/,
        //     params: ['id', 'class'],
        //     handlers: [fn1, fn2]
        // }
    }

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

    get(specs, handlers){
        this.route(specs, ['GET'], handlers)
    }

    post(specs, handlers){
        this.route(specs, ['POST'], handlers)
    }

    put(specs, handlers){
        this.route(specs, ['PUT'], handlers)
    }

    delete(specs, handlers){
        this.route(specs, ['DELETE'], handlers)
    }

    _dispatch(request, response){
        
        let match, handledRequest = false, {url} = request
        for(let route of this._routes){
            // Keep trying  till we find a match 
            match = url.match(route.regex)
            if(match === null || !route.methods.includes(request.method)){
                continue
            }

            // Collect route params value when match found 
            match = match.filter(item => {
                return !item || !item.startsWith('/')
            })
            request.params = route.params.reduce((obj, param, idx) => {
                obj[param] = match[idx]
                return obj
            }, {})

            // Create handler chain and start processing request
            const nextStack =[]
            const handlerStack = route.handlers.slice().reverse()
            const params = Object.values(request.params)
            for(const handler of handlerStack){
                const lastNext = nextStack.pop()
                const next = () => {
                    handler(request, response, lastNext, ...params)
                }
                nextStack.push(next)
            }
            nextStack.pop()()
            handledRequest = true 
            break;
        }

        if(handledRequest){
            return
        }
        response.statusCode = 404;
        response.end("Not Found !")
    }

    _patternToRegex(pattern){
        /*
		 * /test/ -> ^/test/$
		 * /student/:id -> ^/student/(\\w+)$
		 * /project/:name/:sprint? -> ^/project/(\\w+)/(/(\\w+)?)$
         * 
		 */	
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

    _cleanHandlers(handlers){
        if(!Array.isArray(handlers)){
            handlers = [handlers]
        }
        for(let handler of handlers){
            if(typeof handler !== 'function'){
                throw new Error('Route handler should be callable')
            }
        }
        return handlers
    }

}

module.exports = Router