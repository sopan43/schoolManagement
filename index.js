const express = require('express');
const exphbs = require('express-handlebars');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const breadcrumb = require('express-url-breadcrumb');
const multer = require('multer');

const app = express();

// Load Routes
const students = require('./routes/students');
const users = require('./routes/users');
const courses = require('./routes/courses');
const miscellaneous = require('./routes/miscellaneous');
const api = require('./routes/api');
const uploads = require('./routes/uploads');

// Passport Config.
require('./config/passport')(passport);

// Connecting to MongoDB...
const mongoose = require('mongoose');

const url = `mongodb://sopan:sopan@school-shard-00-00.jyw4b.mongodb.net:27017,school-shard-00-01.jyw4b.mongodb.net:27017,school-shard-00-02.jyw4b.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-w3e74l-shard-0&authSource=admin&retryWrites=true&w=majority`;

// const url = `mongodb://sopanmittal43atlas:sopan@ac-7mqzik7-shard-00-00.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-01.wnzl4kq.mongodb.net:27017,ac-7mqzik7-shard-00-02.wnzl4kq.mongodb.net:27017/sdmschool?ssl=true&replicaSet=atlas-vpq55e-shard-0&authSource=admin&retryWrites=true&w=majority`;

const connectionParams={
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true 
}
mongoose.connect(url,connectionParams)
    .then( () => {
        console.log('Connected to database ')
    })
    .catch( (err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })


// mongoose.connect('mongodb://localhost:27017/student-mgmt-sys', {
//     useNewUrlParser: true
// }).then(() => console.log('Connected to MongoDB Server...')).catch(err => console.error('Error occured connecting to MongoDB...', err));



// Load Helpers
const {
    paginate,
    select,
    if_eq,
    select_course
} = require('./helpers/customHelpers');

const {
    ensureAuthenticated,
    isLoggedIn
} = require('./helpers/auth');

// Express Handlebars Middleware.

app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: {
        paginate: paginate,
        select: select,
        if_eq: if_eq,
        select_course: select_course
    }
}));

app.set('view engine', 'handlebars');

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express URL Breadcrumbs
app.use(breadcrumb());

// Body Parser Middleware
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(bodyParser.json());

// Method Override
app.use(methodOverride('_method'));

// Express Session
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport Middleware.
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Global Variables
app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.user = req.user || null;
    next();
});

// Home Route
app.get('/', [isLoggedIn], (req, res) => {
    res.render('home', {
        title: 'Welcome',
        breadcrumbs: false,
        layout: 'home'
    });
});

// Dashboard Route
app.get('/dashboard', [ensureAuthenticated], (req, res) => {
    //console.log(req.originalUrl);
    res.render('dashboard', {
        title: 'Dashboard',
        breadcrumbs: true
    });
});

app.get('/api', (req, res) => {
    res.render('api');
})

app.get('/errors', (req, res) => {
    res.render('errors', {
        title: '404 - Page Not Found.'
    });
});

// Use Routes
app.use('/students', students);
app.use('/users', users);
app.use('/courses', courses);
app.use('/miscellaneous', miscellaneous);
app.use('/api', api);
app.use('/uploads', uploads);

// print.generatePdf();
// Listening on Port:5000
//const port = process.env.port || 3000;
const port = process.env.PORT || 3000;
app.set('port', port);
app.listen(port, () => console.log(`Server started on port : ${port}`));
