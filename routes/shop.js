const path = require('path');

const express = require('express');
const isAuth = require('../middleware/is-auth')
const csrf = require('csurf')
const adminData = require('./admin');
//
const router = express.Router();
const shopController = require('../controllers/shop')
router.get('/',shopController.getIndex );
router.get('/products',shopController.getProduct )
router.get('/products/:productId', shopController.getProducts)
router.get('/cart', isAuth, shopController.getCart)
router.post('/cart',isAuth,  shopController.postCart)
router.get('/checkout', isAuth, shopController.getCheckOut)
router.get('/checkout/success', shopController.getCheckoutSuccess)
router.get('/checkout/cancel',  shopController.getCheckOut)
//router.post('/create-order', isAuth, shopController.postOrder)
router.post('/cart-delete-item', isAuth, shopController.postDeleteItem )

router.post('/delete-order', isAuth, shopController.postDeleteOrder )
router.get('/orders',isAuth, shopController.getOrders)
router.get('/orders/:orderId', isAuth, shopController.getInvoice)
module.exports = router;