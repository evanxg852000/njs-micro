const Router = require('../src/router')
const assert = require('assert')
const sinon = require('sinon')

describe('Router', () => {
    let router = null
    before(() => {

    })

    it('Should break spec properly', () => {
        router = new Router()

        router.route('/home', ['GET'], _ => 2)
        assert.equal(router._routes.length, 1)
        assert.deepEqual(router._routes[0].methods, ['GET'])
        assert.deepEqual(router._routes[0].params, [])
        assert.equal(typeof(router._routes[0].handlers[0]), 'function')
    })

    it('Should break spec properly with correct params', () => {
        router = new Router()

        router.route('/:class/students/:id/:session?', ['GET', 'POST'], [ _ => true, _ => false])
        assert.equal(router._routes.length, 1)
        assert.deepEqual(router._routes[0].methods, ['GET', 'POST'])
        assert.deepEqual(router._routes[0].params, ['class', 'id', 'session'])
        assert.equal(router._routes[0].handlers.length, 2)
    })

    it('Should handle route methods', () => {
        router = new Router()

        router.all('/all', _ => true)
        router.get('/get', _ => true)
        router.post('/post', _ => true)
        router.put('/put', _ => true)
        router.delete('/delete', _ => true)
        
        assert.equal(router._routes.length, 5)
        assert.deepEqual(router._routes[0].methods, ['GET', 'POST', 'PUT', 'DELETE'])
        assert.deepEqual(router._routes[1].methods, ['GET'])
        assert.deepEqual(router._routes[2].methods, ['POST'])
        assert.deepEqual(router._routes[3].methods, ['PUT'])
        assert.deepEqual(router._routes[4].methods, ['DELETE'])
    })

    it('Should dispatch request correctly', () => {
        router = new Router()

        let cb1 = sinon.spy()
        router.route('/home/spy', ['GET'], cb1)
        router._dispatch({url:'/home/spy', method: 'GET'})
        assert.ok(cb1.called)
        cb1.resetHistory()

        let cb2 = (req, res, nex, name) => {
            req.crs = 'crs'
            nex()
        }
        let cb3 = (req, res, nex, name) => {
            if (name){
                assert.equal(name, 'alex')
            }
            assert.equal(req.crs, 'crs')
            nex()
        }
        router.route('/home/people/:name?', ['GET'], [cb2, cb3, cb1])
        
        router._dispatch({url:'/home/people/alex', method: 'GET'}, null)
        assert.ok(cb1.called)
        assert.ok(cb1.calledWith({url:'/home/people/alex', method: 'GET', params: {name: 'alex' },  crs: 'crs'}, null, undefined, 'alex'))
        cb1.resetHistory()

        router._dispatch({url:'/home/people/alex', method: 'GET'}, null)
        assert.ok(cb1.called)
        assert.ok(cb1.calledWith({url:'/home/people/alex', method: 'GET', params: {name: 'alex' },  crs: 'crs'}, null, undefined, 'alex'))
        cb1.resetHistory()

        router._dispatch({url:'/home/people', method: 'GET'}, null)
        assert.ok(cb1.called)
        assert.ok(cb1.calledWith({url:'/home/people', method: 'GET', params: { name: undefined },  crs: 'crs'}, null, undefined, undefined))
        cb1.resetHistory()
    })

    it('Should group routes correctly', () => {
        router = new Router()
        router.all('/all', _ => 2)
        router.group('/get', (r) => {
            r.get('/students', _ => true)
            r.get('/friends', _ => true)
        })
        router.group('/alex', (r) => {
            r.all('/skills', _ => true)
            r.get('/info', _ => true)
        })

        assert.equal(router._routes.length, 5)
        assert.deepEqual(router._routes[1].regex, /^\/get\/students$/)
        assert.deepEqual(router._routes[2].regex, /^\/get\/friends$/)
        assert.deepEqual(router._routes[3].regex, /^\/alex\/skills$/)
        assert.deepEqual(router._routes[4].regex, /^\/alex\/info$/)
    })

})
