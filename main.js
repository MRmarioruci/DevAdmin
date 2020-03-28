const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const mysql      = require('mysql');
const path = require('path');

const client  = redis.createClient();
const router = express.Router();
const app = express();
const redis_port = 6379;
const host = 'localhost';

let login = require('./model/login_model.js');
let register = require('./model/register_model.js'); 
let logger = require('./lib/log.js');
let controlRepositories = require('./controller/controlRepositories.js'); 

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : '',
    password : '',
    database : 'gitTasks'
});
connection.connect();

app.use(session({
    secret: 'secret',
    store: new redisStore({ host: host, port: redis_port, client: client}),
    saveUninitialized: false,
    resave: false
}));

app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));

router.get('/',function(req,res){
    let sess = req.session;
    if(sess.email) {
        return res.redirect('/cms');
    }
    res.sendFile('public/index.html', {root: __dirname })
});
router.get('/cms/:path*',function(req,res,next){
    if(!req.session.email) {
        res.sendFile('public/cms/not_logged.html', {root: __dirname })
    }else{
        next()
    }
});
router.get('/logout',(req,res) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        res.redirect('/');
    });  
});
router.post('/register',(req,res) => {
    if(req.session.email) return res.json({'status':'err','data':'Alredy logged in'});

    register.register(req.body.email,req.body.password, connection, function(err,data){
        if(!err){
            logger.log('info', 'Registration complete');
            req.session.email = req.body.email;
            res.json({'status':'ok','data':data});
        }else{
            logger.log('warn', 'Registration error:', err);
            res.json({'status':'err','data':false});
        }
    });
});
router.all('/login',(req,res) => {
    if(req.session.email) return res.json({'status':'err','data':'Alredy logged in'});

    login.login(req.body.email,req.body.password, connection, function(err,data){
        if(!err){
            logger.log('info', 'Login success');
            req.session.email = req.body.email;
            res.json({'status':'ok','data':data});
        }else{
            logger.log('warn', 'Login error', err);
            res.json({'status':'err','data':false});
        }
    });
});

app.use('/', router);
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3000,() => {
    logger.log('info', `App Started on PORT ${process.env.PORT || 3000}`);
    controlRepositories.run(router,connection,logger);
});