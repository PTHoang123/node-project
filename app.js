const path = require('path');
const mongoose = require('mongoose')
const express = require('express');
const bodyParser = require('body-parser');
const  stripe  = require('stripe')('sk_test_51Ltw3QDi1kZU9WjYlAxPntnlez03zJ7XiucS3kfMh8AawctOqMOkb3kCEdtph93EmuAXEFLf1wdEJWqlgiSwRGcC00qXY8KPyj');
const User = require('./models/user');
const multer = require('multer')
const session = require('express-session')
const csrf = require('csurf')
const errorController = require('./controllers/error')
const flash = require('connect-flash')
const MongoDbStore = require('connect-mongodb-session')(session)
const mongodbUri = 'mongodb+srv://Hoang:Hoangpham0905971735@cluster0.byyezdi.mongodb.net/shop?retryWrites=true&w=majority'
const app = express();
const store = new MongoDbStore({
   uri: mongodbUri,
   collection: 'sessions'
})
console.log(stripe);
const csrfProtection = csrf()
app.set('view engine', 'ejs');
app.set('views', 'views');

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter }).single('image'))
app.use(express.static(path.join(__dirname, 'public' )));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({secret: 'my secret', resave: false, saveUninitialized: false , store: store}))
app.use(csrfProtection)
app.use(flash())
app.use((req,res,next) => {
   if(!req.session.user) {
     return next()
   }
   User.findById(req.session.user._id)
   .then(user =>{
     req.user = user
     next()
   })
   .catch(err => console.log(err))
   
})
 //
app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken()
  next()
})

app.use('/admin', adminRoutes);
app.use(authRoutes)
app.use(shopRoutes);
app.use(errorController.get404);
app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});
mongoose.connect(mongodbUri)
.then(result =>{
  app.listen(3000)
})
.catch(err => console.log(err))