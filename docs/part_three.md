# Part III the template engine

We have covered the squeleton implementation of our framework in [part 1](), We also took care of the router implementation details in [part 2](). Today we will be looking into how we can implement the template engine of our micro framework. The template engine will be structure as a basic compiler that will translate our template code into javascript source code. When an instance of the framework needs the template, the generated javascript code will be loaded and executed. Then template engine should avoid unecessary template compilation when the application is running in a production environement.

Before we dive into how to implement the template engine, we should give an overview of the template syntaxe as well as the translated template source file. We usually want to have a main layout file from which other template files will be derived. An exemple of our main layout file should look like the following snippet.

```html
<html>
<head>
    <title>{{ title }}</title>
</head>
<body>

    <div>
        {% block content %}
            this is the content of a block, it can be overriden.
        {% endblock %}
    </div>
    
</body>
</html> 
```

From the above snippet, we can already see two template syntaxe being introduced:
- `{{title}}` is the syntaxe for displaying the string interpretation of the variable `title`
- `{% block content %}` denotes a block than acts like a place holder to be overriden by child templates

The folowing is a exemple of a child snippet inheriting our main template file.
```html
{% extends main.html %}

{% block content %}

    {% if (test)  %}
        truthy eval
    {% else %}
        falsy eval
    {% endif %}

    <ul>
    {% for (let it of items) %}
        <li>#{{ 'Name' }} : {{ it }}</li>
    {% endfor %}
    </ul>

{% endblock %}
```
As you may have already guessed, the first line tells the template compiler that this template inherites the main template file named `main.html` located in the templates directory. The block syntaxe this time is intended for overiding blocks declared into the base template file. just like overriding a method require the signature to match, overriding a block requires the name to match. Next we have the `if` and the `for` constructs.
Luckly for us the target language of translation is javascript, this means we can just limit ourself into understanding the high level construct ranther than building a full parsing and type checking mechanism. we can just use javascript as the superset of our template engine syntax. This means writiing pure javascript into part of our template should yield a syntaxtycally valid template. An exemple of this is: `for (let it of items)`. Since the application will be dealing with many templates files, we will save the compiled version of the tewmplate into a sub folder called `.tmp`; here our template files will be named with a hashed (sha1) version of the original template file. this way when a template `test.html` is requested for rendering, we first check if the file `templates/.temp/5017803b9ee9b00cc52db4a18a64b71cfc076fd7.js`. if so we load and execute the only function it exports, if not we compile the template from `templates/test.html`. This is how we achive template recompilation all the time in developement mode so that template changes can be reflected automatically. This is also how we achive template caching in production mode as original templates don't change at this level, therefore no need to recompile the template. The consequense of this is that any update to a production instance of an application based on micro framework will require users to delete the `.tmp` file in order to invalidate the template cache. The following is an exemple of a generated template file. Notice the way we name our variable inside the exported function `__njsOutput`, this is a technique realated to code genration in order to avoid name colision. 
```js
module.exports = function (context) {
    //extract context as local variables
    for(let varname of Object.keys(context)){
		  this[varname]= context[varname]
    }
    
    let __njsOutput = ''

    __njsOutput += '<p>The page content ... </p>'
    
    return __njsOutput
}
```




Now that we have a grasp of the template syntax, let's dive into the implementation details by first showing a squeleton of the template class. Since the implementation is longuer than what we have seen so far, we will only show the most important part in the squeleton. We will however discuss all the internal methods as we go along.
```js
class Templater {

    constructor(dir, cached){}

    render(file, context){}

    compile(file){}    
    
    parse(tokens){}

    generate(ast){}

    _tokenize(templateTxt){}

}
```
Our template engine can do two things, compile and template and render a template. In order to compile, it needs tokenise the code, to parse the tokens, and generate the target code. These steps are tipycally the most essential stages of any compiler translator.
-  Tokenisation: also known as scanning or lexing is the process of taking source language and spliting it into most basic unit of the language (e.g word fo english language)
- Parsing: also known as semantic analisys is the process of understanding the structure of language by building an abstract syntaxe tree (semantic tree) out of the tokens.
- Generation: is the process of generating the target language from what was understood, the abstract sybtax tree.

Please note that in real compilers, there are other steps such as type checking (gramatical checks for english) and optimisation (natural language translation, culturale context translation).

Now let's dive in some the implementation details. first stop is the simple constructor.
```js
class Templater {
    ...
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
    ...
}
```
The constructor takes the directory where templates should be located, checks the existence of this directory and make sure subdirectory `.tmp` is also ready. It also accepts a boolean variable to denoting if caching should be enabled, recall that this depends on whether the app is running in production mode.
Note: `existsSync` May not seems to you as an idiomatic way of doing things in NodeJS, but there are cases where synchronous actions are more appropriate. Our next stop is the render method:

```js
class Templater {
    ...
    render(file, context){
        let sourceFile = path.join(this._dir, file)
        let compiledFile = this._compiledFile(file)
        if(!fs.existsSync(sourceFile)){
            throw Error('Template not found!')
        }

        let render = null
        //checks if compiled file exist
        if(this._cached && fs.existsSync(compiledFile)){
            render = require(compiledFile)
            return render(context)
        }

        let ast = this.compile(file)
        this._saveGenCode(file, this.generate(ast))
        render = require(compiledFile)
        return render(context)
    }    
    ...
}
```
The `render` method will accepts the template file to render as well as the `context`, the context is a javascript object containing all data that will be available to the template file during the renderiong process as variable. We first build the source file path and get the compile file name (sha1) by calling `this._compiledFile(file)`. If the template file is not found, we just raised an error. Next we check if cached is allowed and if a precompiled template exists. If so, we require that compiler template and renders it by passing the context. Otherwise we need to compile the template (this is alwayse the case in dev mode). We first compile the template into an ast, then walk the ast to generate and save the final template file by calling `this._saveGenCode(file, this.generate(ast))`. Finaly we load and execute it as we did before for the precompiled one. Now let's explore the other methods.
```js
    compile(file){
        let ast = this.parse(this._tokenize(this._readTmplSource(file)))
        return ast  
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


```

The `compile` methods first reads the template file, tokenizes and parse it to build the abstract syntax tree as a `TemplateNode` object. The `_tokenize` helper method splits the template source code into chunks that can be processed in the `parse` method. In the `parse` method, we create a javascript object named `_parser` that will maintain the state of the parsing activity. The next step is  to construct the root node of the AST represented by a TemplateNode. then call the helper method `_parse` that will build all the AST tree recursively. This technique of parsing is called recursive decent parsing as the parse tree is built from top to down by recursivelly parsing child nodes. 

```js
class Templater {
    ...
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
    ...
}
```

So the `_parse` helper method takes the AST and an array or string denoting when to stop parsing the current construct.
It loops througth the tokens using the parser state (`_parser`). Tokens come into two forms `{{code}}` or `{% code %}`, therefore we first get rid of the markers and split the code into expressions array.
Next we check whether to stop or keep moving. following is a set of check to match which construct should be parsed.
If the token starts with `{{` then we parse an OutNode for output/display.
In order to check for others, we need to extract the first expression inside `{% code %}`, remember we splited code into `expr` so the first entry should be the keyword expressing the construct we are dealing with. We assign that first entry to `keyword` and check against `extends`, `block`, `if`, `for` to parse the construct. If none matches then we build a default `TextNode` that will just output the raw template text. 
For breavity reasons, we wont go into the implementation details of the different Nodes, Please refer to [github repo]().

The last snippet we will show is the code generation method. The code generation simply walks the tree and calls generate on each Node. As for the parsing, every Node knows how to generate its target code by assuming the following variables will be available: `context`, `__njsOutput`. 

```js
class Templater {
    ...
    generate(ast){
        return `module.exports = function (context) {
            context = context || {}
            for(let varname of Object.keys(context)){
                this[varname]= context[varname]
            }
            let __njsOutput = ''
            ${ast.generate()}
            return __njsOutput
        }`
    }    
    ...
}
```

If you were able to make this far in this series by coding along, Please give yourself a standing ovation -  well fake it as if you just scored a memorable goal in one of the important sport event in this world. 
I hope you enjoyed it as much as I did writting this article while leveling up my writting skills. Now rather than using this as a based to create the Nth framework, please use this as a basis to contribute to rpoduction ready onces. 

Thank you for reading, you comments, suggestions and PR are most welcome at [Github](https://github.com/evanxg852000/njs-micro)