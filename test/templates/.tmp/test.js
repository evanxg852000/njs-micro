module.exports = function (context) {
            //extract context as local variables
            for(let varname of Object.keys(context)){
                this[varname]= context[varname]
            }
            let __njsOutput = ''
            __njsOutput += `<html>
<head>
    <title>` 
__njsOutput +=  title  
__njsOutput += `</title>
</head>
<body>

    <div>
        ` 
 if (test) { 
 __njsOutput += `
        truthy eval
    ` 
 
} else {  __njsOutput += `
        falsy eval
    ` 
 
 } 
 
 __njsOutput += `

    <ul>
    ` 
 
 for (let it  of iterable) { 
 __njsOutput += `
        <li>#` 
 
 __njsOutput +=  idx+1  
 
 __njsOutput += ` : ` 
 
 __njsOutput +=  it  
 
 __njsOutput += `</li>
    ` 
 
 } 
 
 __njsOutput += `
    </ul>

` 
 

            return __njsOutput
        }