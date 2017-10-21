var express=require('express');
var bodyParser=require('body-parser');
var app=express();
app.use(bodyParser.urlencoded({
	limit:'50mb',
	extended:true
}));
app.use(bodyParser.json({limit:'50mb'}));
app.set('views','./views');
app.set('view engine','ejs');

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/result"));

require('./app/routes/route.js')(app);

app.listen(3000);
module.exports=app;
