// agencies.js - Routes cho Agencies (Đại lý/Chi nhánh)
const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');

// Overview & Regions
router.get('/overview', agencyController.getAgenciesOverview);
router.get('/regions', agencyController.getRegions);

// CRUD
router.get('/', agencyController.getAgencies);
router.get('/:id', agencyController.getAgencyById);
router.post('/', agencyController.createAgency);
router.put('/:id', agencyController.updateAgency);
router.delete('/:id', agencyController.deleteAgency);

// Dashboard & Stats
router.get('/:id/dashboard', agencyController.getAgencyDashboard);
router.get('/:id/customers', agencyController.getAgencyCustomers);
router.get('/:id/projects', agencyController.getAgencyProjects);

// Customer Assignment
router.post('/:id/assign-customer', agencyController.assignCustomer);
router.post('/transfer-customer', agencyController.transferCustomer);

module.exports = router;
