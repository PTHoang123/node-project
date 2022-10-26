const Product = require('../models/product') 
const {validationResult} = require('express-validator')
const fileHelper = require('../Util/file')
exports.getAddProduct  = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
     path: '/admin/add-product',
     editing: false,
     hasEror: false,
     errorMessage: null,
     validationErrors: []
  })
}


exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(products => {  
      if (!products) {
        return res.redirect('/');
      }
      
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: products,
        hasEror: true,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

  exports.postAddProduct= (req, res, next) => {
    const title = req.body.title
    const image = req.file
    const description = req.body.description
    const price = req.body.price
    const errors  = validationResult(req)
    if(!image) {
      return  res.status(422).render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: false,
        hasEror: true,
        product: {
          title: title,
          description: description,
          price: price
        },
        errorMessage: 'Attached file is not an image',
        validationErrors: []
      });
    }
    const imageUrl = image.path
    if(!errors.isEmpty()) {
      console.log(errors.array());
    return  res.status(422).render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: false,
        hasEror: true,
        product: {
          title: title,
          imageUrl: imageUrl,
          description: description,
          price: price
        },
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
      });
    }
    const product = new Product({
      title: title,
      imageUrl: imageUrl,
      description: description,
      price: price,
      userId: req.user
  })
  console.log(image);
    product.save()
    .then(result => {

      res.redirect('/admin/products') 
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
  }

  exports.postEditProducts = (req,res,next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title
    const image = req.file
    const updatedDescription = req.body.description
    const updatedPrice = req.body.price
    const errors = validationResult(req)
    if(!image) {
      return  res.status(422).render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: false,
        hasEror: true,
        product: {
          title: title,
          description: description,
          price: price
        },
        errorMessage: 'Attached file is not an image',
        validationErrors: []
      });
    }
    if(!errors.isEmpty()) {
      console.log(errors.array());
    return  res.status(422).render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: true,
        hasEror: true,
        product: {
          title: updatedTitle,
          description: updatedDescription,
          price: updatedPrice,
          _id: prodId,
        },
        validationErrors: errors.array(),
        errorMessage: errors.array()[0].msg
      });
    }
     
    Product.findById(prodId)
    .then(products => {
      console.log(products);
      if(products.userId.toString() !== req.user._id.toString()){
        req.flash('error', 'you are not permission to edit this product')
        return res.redirect('/')
      }
      products.title = updatedTitle
      if(image) {
        fileHelper.deleteFile(product.imageUrl)
        products.imageUrl = image.path
      }
      products.description = updatedDescription
      products.price = updatedPrice
      return products.save()
    })
    .then(result => {console.log(result)
    res.redirect('/admin/products')}
    )
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
    
  }
  exports.deleteProduct = (req,res,next) => {
    const proId = req.params.productId
    Product.findById(proId)
    .then(product => {
      if(!product){
        return next(new Error('No Product found'))
      }
      fileHelper.deleteFile(product.imageUrl)
      return Product.deleteOne({_id: proId, userId: req.user._id})
    })  
    .then(result => {
    console.log('Delete Success')
    res.status(200).json({message : 'success'})
    }
    )
    .catch(err => {
      res.status(500).json({message : 'Delete Fail'})
    })
  }
  exports.getProducts = (req, res, next) => {
     Product.find()
      .then(products => {
        console.log(products);
        res.render('admin/products', {
          prods: products,
          pageTitle: 'Admin Products',
          path: '/admin/products',
          isAuthenticated: req.session.isLoggedIn
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  };