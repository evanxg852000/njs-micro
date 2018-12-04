module.exports = function (context) {
    //extract context as local variables
    for(let varname of Object.keys(context)){
		  this[varname]= context[varname]
    }
    
    let __njsOutput = ''
    
    __njsOutput += title

    __njsOutput += '<p>more content ... </p>'
    
    return __njsOutput
}