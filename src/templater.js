const fs = require('fs')
const path = require('path')
var crypto = require('crypto');

class Templater {

    constructor(dir, cached){
        this._dir = path.resolve(dir)
        this._cached = cached || false
        this._compiledDir = path.join(this._dir, '.tmp')
        // create compiled directory if not exist
        if(!fs.existsSync(this._dir)){
            throw Error('Template directory does not exist')
        }
        if (!fs.existsSync(this._compiledDir)) {
            fs.mkdirSync(this._compiledDir)
        }
    }

    render(file, context){
        let sourceFile = path.join(this._dir, file)
        let compiledFile = this._compiledFile(file)
        if(!fs.existsSync(sourceFile)){
            throw Error('Template not found!')
        }

        let render = null
        //compare file dates if it was previously compiled
        if(this._cached && fs.existsSync(compiledFile)){
            render = require(compiledFile)
            return render(context)
        }

        let ast = this.compile(file)
        this._saveGenCode(file, this.generate(ast))
        render = require(compiledFile)
        return render(context)
    }

    compile(file){
        let ast = this.parse(this._tokenize(this._readTmplSource(file)))
        return ast  
    }

    generate(ast){
        return `module.exports = function (context) {
            // extract context as local variables
            context = context || {}
            for(let varname of Object.keys(context)){
                this[varname]= context[varname]
            }
            let __njsOutput = ''
            ${ast.generate()}
            return __njsOutput
        }`
    }

    _compiledFile(file){
        let fileName = crypto.createHash('sha1').update(file).digest("hex");
        return path.join(this._compiledDir, fileName + '.js')
    }

    _readTmplSource(file){
        return fs.readFileSync(path.join(this._dir, file), 'utf8')
    }
    
    _saveGenCode(file, content){
        if (!fs.existsSync(this._compiledDir)) {
            fs.mkdirSync(tmpDir)
        }
        fs.writeFileSync(this._compiledFile(file), content, 'utf8')
    }

    _saveManifest(entry){
        if(!entry)
            return
        this._manifest = Object.assign(this._manifest, entry)
        fs.writeFileSync(this._manifestFile, JSON.stringify(this._manifest), 'utf8')
    }

    _tokenize(templateTxt){
        const token_regex = /({{.*?}}|{%.*?%})/
        return templateTxt.split(token_regex).filter( match => {
            return match.trim() !== ''
        })
    }

    parse(tokens){
        this._parser = {
            templater: this,
            tokens: tokens,
            pos: 0
        }
        let rootAst = new TemplateNode(this._parser, tokens[0])
        this._parse(rootAst)
        return rootAst
    }

    _parse(ast, stops){
        while(this._parser.pos < this._parser.tokens.length){
            let token = this._parser.tokens[this._parser.pos]
            let expr = token.replace(/[%{}]/g, '').trim().split(/\s(.+)/)
            
            if(stops && Array.isArray(expr) && stops.includes(expr[0])) {
                
                this._parser.pos += 1
                return expr[0] //stop parsing nested block
            }

            //output
            if(token.startsWith('{{')){
                let outNode = new OutNode(this._parser, [token])
                outNode.parse(ast)
                continue
            }

            let keyword = expr[0]
            
            //extend
            if(keyword === 'extends'){
                let templateNode = new TemplateNode(this._parser, expr)
                templateNode.parse(ast)
                continue
            }

            //block
            if(keyword === 'block'){
                let blockNode = new BlockNode(this._parser, expr)
                blockNode.parse(ast)
                continue
            }

            
            //if
            if(keyword === 'if'){
                let ifNode = new IfNode(this._parser, expr)
                ifNode.parse(ast)
                continue
            }

            //for
            if(keyword === 'for'){
                let forNode = new ForNode(this._parser, expr)
                forNode.parse(ast)
                continue
            }

            //text
            let textNode = new TextNode(this._parser, [token])
            textNode.parse(ast)
        }
    }

    isAnyOf(files){
        return {
            newerThan: (than) => {
                tempChangedOn = ((files.map((file) => {
                    return fs.statSync(file).mtime
                })).sort().reverse())[0]
                return tempChangedOn > s.statSync(than).mtime
            }
        }
    }

}


class Node {
    constructor(parser, exprs){
        this._parser = parser
        this._exprs = exprs
        this.nodes = []
    }

    parse(ast){}
    
    generate(){}

}


class TemplateNode  extends Node {
    constructor(parser, exprs){
        super(parser, exprs)
        this.parent = null
    }

    parse(ast) {
        let file = this._exprs[1]
        this._parser.pos += 1
        let tmp = new Templater(this._parser.templater._dir)
        ast.parent = tmp.compile(file)
    }

    generate(){
        let output = ''
        if(this.parent){
            //collect blocks
            let blocks = {}
            for(let blk of this.nodes){
                if(blk.constructor.name === 'BlockNode') {
                    blocks[blk.name] = blk
                }
            }
            for(let node of this.parent.nodes){
                //if it's an overriden block
                if(node.constructor.name === 'BlockNode' && blocks[node.name]){
                    output += blocks[node.name].generate()
                    continue
                }
                output += node.generate()
            }
            return output
        }

        for(let node of this.nodes){
            output += node.generate()
        }
        return output
    }
}

class BlockNode extends Node {
    constructor(parser, exprs){
        super(parser, exprs)
        this.name = null
    }

    parse(ast){
        this.name = this._exprs[1]
        this._parser.pos += 1
        this._parser.templater._parse(this, ['endblock'])
        ast.nodes.push(this)
    }

    generate() {
        let output = ''
        for(let node of this.nodes){
            output += ` ${node.generate()} \n`
        }
        return output
    }

}

class OutNode extends Node {
    
    parse(ast) {
        this.expr = this._exprs[0].replace(/[{}]/g, '')
        this._parser.pos += 1
        ast.nodes.push(this)   
    }

    generate() {
        return `__njsOutput += ${this.expr} \n`
    }

}

class TextNode extends Node {
    parse(ast) {
        this.text = this._exprs[0]
        this._parser.pos += 1
        ast.nodes.push(this)
    }

    generate() {
        return `__njsOutput += \`${this.text}\` \n`
    }
}

class IfNode extends Node{
    constructor(parser, exprs){
        super(parser, exprs)
        this.expr = null
        this.ifNode = new BlockNode(parser, exprs)
        this.elseNode = new BlockNode(parser, this.exprs)
    }

    parse(ast){
        this.expr = this._exprs[1]
        this._parser.pos += 1
        let stop = this._parser.templater._parse(this.ifNode, ['else', 'endif'])
        if(stop === 'else') {
            this._parser.templater._parse(this.elseNode, ['endif'])
        } else {
            this.elseNode = null
        }
        ast.nodes.push(this)
    }

    generate() {
        let output = ''
        output += `if ${this.expr} { \n`
        for(let node of this.ifNode.nodes){
            output += ` ${node.generate()} \n`
        }
        if(this.elseNode){
            output += `} else { `
            for(let node of this.elseNode.nodes){
                output += ` ${node.generate()} \n`
            }
        }
        output += ` } \n`
        return output
    }
}

class ForNode extends Node{
    constructor(parser, exprs){
        super(parser, exprs)
        this.expr = null
    }

    parse(ast){
        this.expr = this._exprs[1]
        this._parser.pos += 1
        this._parser.templater._parse(this, ['endfor'])
        ast.nodes.push(this)
    }

    generate() {
        let output = ''
        output += `for ${this.expr} { \n`
        for(let node of this.nodes){
            output += ` ${node.generate()} \n`
        }
        output += ` } \n`
        return output
    }
}






module.exports = Templater