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
The `render` method will accepts the template file to render as well as the `context`, the context is a javascript object containing all data that will be available to the template file during the renderiong process as variable. We first build the source file path and get the compile file name (sha1) by calling `this._compiledFile(file)`. If the template file is not found, we just raised an error. Next we check if cached is allowed and if a precompiled template exists. If so, we require that compiler template and renders it by passing the context. Otherwise we need to compile the template (this is alwayse the case in dev mode). We first compile the template into an ast, then walk the ast to generate and save the final template file by calling `this._saveGenCode(file, this.generate(ast))`. Finaly we load and execute it as we did before for the precompiled one. 





