// this is a scratch may not reflect
const micro = require('njs-micro')
micro.config({
    env: 'prod',
    templates: './templates',
    mixedMidelware: true,
})

micro.route('/home', (req, res) => {
    res.render('index.html', {})
    res.end(200, 'Hello world')
})



const authMidleware = (req, res, next) => {

    next() //will fetch the internal req,res and call the handler with next
}

const jsonTransformMideware = (req, res, next) => {

}


micro.get('/students/:id', [authMidleware, (req, res) => {

}, jsonTransformMideware])



micro.run((err) => {
    if(!err) 
        console.log('Yahooo !!!')
})