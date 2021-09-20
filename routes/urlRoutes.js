const express = require('express')
const router = express.Router()
const urlController = require('../controllers/urlController')
const urlAuthController = require('../controllers/urlAuthController')

router
  .route('/getDashboardHomeStats')
  .post(
    urlAuthController.protect, 
    urlAuthController.legalUser,
    urlController.getDashboardHomeStats
  )

router
  .route('/checkLogin')
  .post(urlAuthController.protectLogin)

router
  .route('/getMyLinksStats')
  .post(
    urlAuthController.protect, 
    urlAuthController.legalUser,
    urlController.getMyLinksStats
  )

router
  .route('/getAnalitycsOverview')
  .post(
    urlAuthController.protect, 
    urlAuthController.legalUser,
    urlController.getAnalitycsOverview
  )

router
  .route('/getDeviceAllLinksStats')
  .post(
    urlAuthController.protect, 
    urlAuthController.legalUser,
    urlController.getDeviceAllLinksStats
  )

router
  .route('/:id/edit')
  .get(
    urlAuthController.protect, 
    urlAuthController.legalUser,
    urlController.editOneLink
  )

router
  .route('/:id/updateLink')
  .post(
    urlAuthController.protect,
    urlController.updateLink
  )

router
  .route('/:short')
  .get(
    urlController.rocketTarget
  )

router
  .route('/')
  .post(
    urlAuthController.populateUser, 
    urlController.createUrl
  )

router
  .route('/links')
  .get(urlAuthController.protect, urlAuthController.legalUser, urlController.getAllUrls)

router
  .route('/random/random')
  .post(
    urlController.randomUrl
  )

module.exports = router
