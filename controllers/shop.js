const Order = require('../models/order');
const Product = require('../models/product'); 
const User = require('../models/user');

const path = require('path')
const fs = require('fs');
const PDFDocument = require('pdfkit');
const  stripe  = require('stripe')('sk_test_51Ltw3QDi1kZU9WjYlAxPntnlez03zJ7XiucS3kfMh8AawctOqMOkb3kCEdtph93EmuAXEFLf1wdEJWqlgiSwRGcC00qXY8KPyj');
//
const ITEM_PER_PAGE = 2
  exports.getProduct =  (req, res, next) => {
    const page = +req.query.page || 1 
   let totalItem;
   Product.find()
   .countDocuments()
   .then(numberProduct => {
     totalItem = numberProduct
     return Product.find()
     .skip((page - 1 ) * ITEM_PER_PAGE)
     .limit(ITEM_PER_PAGE)
   })
    .then((products) =>{
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        currentPage: page,
        totalProduct: totalItem,
        hasNextPage: ITEM_PER_PAGE * page < totalItem,
        hasPreviousPage: page > 1 ,
        nextPage: page + 1 ,
        previousPage : page -1,
        lastPage:  Math.ceil(totalItem / ITEM_PER_PAGE)
       })}
       )
       .catch(err => {
        const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
       })
    
  }
  exports.getProducts =  (req, res, next) => {
   const prodId = req.params.productId
   Product.findById(prodId)
   .then((product) => {
    res.render('shop/product-detail', {
      product: product,
      pageTitle: product.title,
      path: '/products',
      isAuthenticated: req.session.isLoggedIn
    });
  })
   .catch(err => {
    const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
   })
   
  }

  exports.getIndex = (req,res,next) => {
   const page = +req.query.page || 1 
   let totalItem;
   Product.find()
   .countDocuments()
   .then(numberProduct => {
     totalItem = numberProduct
     return Product.find()
     .skip((page - 1 ) * ITEM_PER_PAGE)
     .limit(ITEM_PER_PAGE)
   })
    .then((products) =>{
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        totalProduct: totalItem,
        hasNextPage: ITEM_PER_PAGE * page < totalItem,
        hasPreviousPage: page > 1 ,
        nextPage: page + 1 ,
        previousPage : page -1,
        lastPage:  Math.ceil(totalItem / ITEM_PER_PAGE)
       })}
       )
       .catch(err => {
        const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
       })
  }
  exports.getCart = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
          .then(products => {
            res.render('shop/cart', {
              path: '/cart',
              pageTitle: 'Your Cart',
              products: products.cart.items,
              isAuthenticated: req.session.isLoggedIn
            });
          })
          .catch(err => {
            const error = new Error(err);
              error.httpStatusCode = 500;
              return next(error);
           })
  };
  exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
      .then(product => {
        return  req.user.addToCart(product);          
      })
       .then(cart => {
        res.redirect('/cart');
       })
       .catch(err => {
        const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
       })
  };


  exports.postDeleteItem = (req,res,next) => {
    const prodId = req.body.productId;
    req.user
      .removeFromCart(prodId)
      .then(result => {
        res.redirect('/cart');
      })
      .catch(err => {
        const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
       })
    
  }
  exports.getOrders = (req,res,next)=> {
    Order.find({'user.userId': req.user._id})
    .then(order => {
      res.render('shop/orders',{
        path: '/checkout',
        pageTitle: 'Your Cart',
        orders: order,
        isAuthenticated: req.session.isLoggedIn,
      })
    } )
  }

exports.getCheckoutSuccess = (req, res,next) => {
  req.user
  .populate('cart.items.productId')
    .then(product =>{
      console.log(product);
     const products = product.cart.items.map(item => {
      return {
        product: {...item.productId._doc},
        quantity: item.quantity
      }
     })  
     
     const order = new Order({
      products: products,
      user: {
      email: req.user.email,
      userId: req.user
      }
    })    
    return order.save()
    .then(() => {
     return req.user.clearCart()
    })
    .then(res.redirect('/orders'))
    })
    .catch(err => {
      const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
     })
}
  exports.getCheckOut = (req,res,next) => {
    let products;
    let totalPrice = 0
    req.user
    .populate('cart.items.productId')
    .then(user => {
      products = user.cart.items
      products.forEach(p => {
        totalPrice += p.quantity*p.productId.price
      })
      return stripe.checkout.sessions.create({
        payment_method_types : ['card'],
        line_items: products.map(p => {
          return {
            price_data: {
              currency: 'usd',
              unit_amount: p.productId.price *100 ,
            
            product_data: {
              name:  p.productId.title,
              description: p.productId.description,
            },
          },
            quantity: p.quantity
          }
        }),
      mode: 'payment',  
      success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
      cancel_url:  req.protocol + '://' + req.get('host') + '/checkout/cancel',
      })
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'checkOut',
        products: products,
        sessionId: session.id,
        totalSum: totalPrice
      })
    })
    .catch(err => {
      const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
     })
  }

exports.postDeleteOrder = (req,res,next) => {
  const orderId = req.body.orderId
  Order.deleteOne({_id : orderId})
  .then(() => {
    res.redirect('/orders')
  })
  .catch(err => {
    const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
   })
}
  
exports.getInvoice = (req,res,next) => {
  const orderId =  req.params.orderId
  Order.findOne({_id: orderId})
  .then(order => {
    if(!order){
      return next(new Error('No order found'))
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error('Unauthorized'))
    }
    const invoiceName = `invoice-${orderId}.pdf`
    const invoicePath = path.join( 'data', 'invoices', invoiceName)
    const pdfDoc = new PDFDocument()
    pdfDoc.pipe(fs.createWriteStream(invoicePath))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
          'Content-Disposition',
          'inline; filename="' + invoiceName + '"'
        );
    pdfDoc.pipe(res)
    pdfDoc.text('Invoice', {
      underline: true
    })
    pdfDoc.text('------------')
    let totalPrice = 0
    order.products.forEach(prod => {
     pdfDoc.text(`${prod.product.title}(${prod.quantity})---$${prod.product.price}`)
     totalPrice += prod.product.price*prod.quantity
    })
    pdfDoc.fontSize(16).text(`Total Price = $${totalPrice}`)
    pdfDoc.end()
    //fs.readFile(invoicePath, (err,data) => {
    //  if(err)  {
    //    return next(err)
    //  }
    //  res.setHeader(
    //    'Content-Disposition',
    //    'inline; filename="' + invoiceName + '"'
    //  );
    // res.send(data)
    //})
    //const file = fs.createReadStream(invoicePath)
    //res.setHeader('Content-Type', 'application/pdf')
    //res.setHeader(
    //      'Content-Disposition',
    //      'inline; filename="' + invoiceName + '"'
    //    );
    //file.pipe(res)
  })
  .catch(err => next(err))
}
