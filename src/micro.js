const http = require('http')
const Router = require('./router')
const Templater = require('./templater')

class Micro {
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


    route(fn){
        if( typeof(fn) !== 'function'){
            return
        }
        return fn(this.router)
    }

    _handleRequest(request, response){
        this._patchResponse(response)
        this.router._dispatch(request, response)
    }

    _patchResponse(response){
        response.render = (file, context) => {
            try {
                response.end(this.templater.render(file, context))
            } catch (err) {
                if(this.config.env.toLowerCase().startsWith('prod')){
                    response.statusCode = 500;
                    response.end('Internal Server Error')
                    return
                }
                response.end(`${err.message} \n ${err.stack}`)
            }
        }
    }

}

module.exports = Micro