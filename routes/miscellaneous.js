const express = require('express')
const router = express.Router()
const { StudentFee, validateFee } = require('../models/extras')

const { ensureAuthenticated , isAdmin, readAccessControl} = require('../helpers/auth')

router.get('/',[ensureAuthenticated, isAdmin, readAccessControl], async (req, res) => {
  res.render('miscellaneous/index', {
    title: 'Miscellaneous',
    breadcrumbs: true
  })
})

router.get('/session', async (req, res) => {
    console.log("SOPAN SESSION");
    res.render('miscellaneous/session', {
      title: 'Miscellaneous',
      breadcrumbs: true
    })
})


module.exports = router
