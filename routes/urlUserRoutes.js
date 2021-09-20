const express = require('express')
const router = express.Router()
const urlUserController = require('../controllers/urlUserController')
const urlAuthController = require('../controllers/urlAuthController')

router
  .route('/signup')
  .post(urlAuthController.signup)

router
  .route('/login')
  .post(urlAuthController.login)

router
  .route('/forgotPassword')
  .post(urlAuthController.forgotPassword)

router
  .route('/resetPassword/:token')
  .patch(urlAuthController.resetPassword)

router
  .route('/updateMyPassword')
  .patch(urlAuthController.protect, urlAuthController.updatePassword)

router
  .route('/updateMe')
  .patch(urlAuthController.protect, urlUserController.updateMe)

router
  .route('/deleteMe')
  .delete(urlAuthController.protect, urlUserController.deleteMe)

router
  .route('/')
  .get(urlUserController.getAllUsers)
  .post(urlUserController.createUser)
 
router
  .route('/:id')
  .get(urlUserController.getUser)
  .patch(urlUserController.updateUser)
  .delete(urlUserController.deleteUser)

module.exports = router
