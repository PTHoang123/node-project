const User = require('../models/user')
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const crypto = require('crypto');
const {validationResult} = require('express-validator')
//
const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key:'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'
  }
}))
exports.getLogin = (req,res,next)=> {
    //const isLoggedIn =  req.get('Cookie').split('=')[1] === 'true'
    let message = req.flash('error')
    if(message.length > 0){
      message = message[0]
    } else {
      message = null
    }
    console.log(req.session.isLoggedIn);
      res.render('auth/login',{
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
          email: '',
          password: '',
        },
        validationErrors: []
      })
     
  }

exports.getSignup = (req,res,next) => {
  let message = req.flash('error')
    if(message.length > 0){
      message = message[0]
    } else {
      message = null
    }
  res.render('auth/signup', {
     path: '/signup',
     pageTitle: 'Signup',
     errorMessage: message,
     oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  })
} 

exports.postLogin = (req,res,next) => {
   const email = req.body.email
   const password = req.body.password
   const errors = validationResult(req)
   if(!errors.isEmpty()){
    console.log(errors.array());
    return res.status(422).render('auth/login',{
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    })
   }
    User.findOne({email: email})
    .then(user => {
      if(!user){
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid Email or Password',
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: []
       })
      }
      bcrypt
      .compare(password, user.password)
      .then(match => {
        if(match){  
          req.session.isLoggedIn = true;
          req.session.user = user;
         return req.session.save(err => {
            console.log(err);
             res.redirect('/')
          })
        } 
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: []
       })
      })
    })
    .catch(err => {
      console.log(err)
      res.redirect('/login')
    })
}
exports.postSignup = (req,res,next) => {
 const email = req.body.email
 const password = req.body.password
 const errors = validationResult(req)
 if(!errors.isEmpty()){
  console.log(errors.array());
  return res.status(422).render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: errors.array()[0].msg,
    oldInput: {
      email: email,
      password: password,
      confirmPassword: req.body.confirmPassword
    },
    validationErrors: errors.array()
 })
 }

     bcrypt
    .hash(password, 8) 
    .then(passwordHash => {
      const user = new User({
        email: email,
        password: passwordHash,
        cart: {items: []}
      })
      return user.save()
    })
    
    .then(result => {
      res.redirect('/login')
      return transporter.sendMail({
        to: email,
        from: 'hoangphamlol456@gmail.com',
        subject: 'Signup Succeeded!',
        html: '<h1>you succesfully signup</h1>'
      })
    })
    .catch(err => console.log(err))
    
 .catch(err => console.log(err))
}


exports.postLogout = (req,res,next) => {
   req.session.destroy(() => {
    res.redirect('/login')
    console.log(req.session);
   })
}
 
exports.getReset = (req,res,next) => {
  let message = req.flash('error')
  if(message.length > 0){
    message = message[0]
  } else {
    message = null
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
 })
}

exports.postReset = (req,res,next) => {
   crypto.randomBytes(32, (err, buffer) => {
    if(err) {
      console.log(err);
      return res.redirect('/reset')
    }
    const token = buffer.toString('hex')
    User.findOne({email: req.body.email})
    .then(user => {
      if(!user){
        req.flash('error', 'email not found')
        return res.redirect('/reset')
      }
      user.resetToken = token
      user.resetTokenExpiration = Date.now() + 3600000
      return user.save()
    })
    .then(() => {
      res.redirect('/')
      transporter.sendMail({
        to: req.body.email,
        from: 'hoangphamlol456@gmail.com',
        subject: 'Reset Password ',
        html: `
        <p>You requested reset password</p>
        <p>click this <a href="http://localhost:3000/reset/${token}">Link</a> to set new password</p>
        `
      })
    })
    .catch(err => console.log(err))
   })
}

exports.getNewPassword = (req,res,next) => {
  const token = req.params.token
  User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
  .then(user => {
    let message = req.flash('error')
  if(message.length > 0){
    message = message[0]
  } else {
    message = null
  }
  res.render('auth/new-password',{
    path: '/new-password',
    pageTitle: 'New Password',
    errorMessage: message,
    userId: user._id.toString(),
    passwordToken: token
  })
  })
  .catch(err => console.log(err))
  
}

exports.postNewPassword = (req,res,next) => {
  const newPassword = req.body.password
  const userId = req.body.userId
  const passwordToken = req.body.passwordToken
  let resetUser
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {$gt: Date.now()},
    _id: userId
  })
  .then(user => {
    resetUser = user
    return bcrypt.hash(newPassword, 8)
  })
  .then(hashedPassword => {
    resetUser.password = hashedPassword,
    resetUser.resetToken = undefined,
    resetUser.resetTokenExpiration = undefined
    return resetUser.save()
  })
  .then(
    res.redirect('/login')
  )
  .catch(err => console.log(err))
}