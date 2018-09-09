const Templater = require('../src/templater')
const assert = require('assert')
const path = require('path')
const fs = require('fs')
const sinon = require('sinon')

describe('Templater', () => {
    let templater = null
    let basePath = ''
    before(() => {
        basePath = path.resolve('./test/templates')
        try {
            fs.unlinkSync(path.join(basePath, '.tmp', 'manifest.json'))
            fs.unlinkSync(path.join(basePath, '.tmp'))
        } catch (_) {}  
    })

    it('Should create a templater', function() {
        templater = new Templater('./test/templates')
        assert.equal(templater._dir, basePath);
        assert.equal(templater._compiledDir, path.join(basePath, '.tmp'))
        assert.throws( _ => new Templater('./not_found_templates'), Error)
    })

    it('Should call render template correctly', function() {
        templater = new Templater('./test/templates')
    
        assert.deepEqual(templater._tokenize(''), [])
        assert.deepEqual(
            templater._tokenize('{% extends layout.hmtl %} {{ name }}'),
            ['{% extends layout.hmtl %}', '{{ name }}']
        )

        let tokens = templater._tokenize(templater._readTmplSource('main.html'))
        assert.equal(Array.isArray(tokens), true)
        assert.equal(tokens.length, 7)

        let tmplSource = templater._readTmplSource('index.html')
        tokens = templater._tokenize(tmplSource)
        assert.equal(tmplSource, fs.readFileSync('./test/templates/index.html'))
        assert.equal(tokens.length, 17)

        let ast = templater.parse(tokens)
        assert.equal(ast.constructor.name, 'TemplateNode')
        assert.equal(ast.nodes.length, 1)
        assert.equal(ast.parent !== null, true)
        
        let genCode = templater.generate(ast)
        assert.equal(genCode.includes('__njsOutput +=  title'), true)
        assert.equal(genCode.includes('if (test) {'), true)
        assert.equal(genCode.includes('} else {  __njsOutput += `'), true)
        assert.equal(genCode.includes('for (let it  of items) { '), true)
        assert.equal(genCode.includes(`__njsOutput +=  'idx+1'`), true)
        

        let response = templater.render('index.html', {title: 'Home', test:true, items: ['Evan', 'John', 'Jane']} )
        assert.equal(response.includes('<title>Home</title>'), true)
        assert.equal(response.includes('truthy eval'), true)
        assert.equal(response.includes('<li>#idx+1 : Evan</li>'), true)
        assert.equal(response.includes('Jane'), true)
       
    })

})