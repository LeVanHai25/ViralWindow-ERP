const express = require("express");
const router = express.Router();
const customerCtrl = require("../controllers/customerController");
const customerCRMCtrl = require("../controllers/customerCRMController");

// Routes cụ thể phải đặt TRƯỚC routes có :id để tránh conflict
router.get("/", customerCtrl.getAllCustomers);
router.get("/next-code", customerCtrl.getNextCode);  // Must be before /:id
router.get("/appointments/upcoming", customerCRMCtrl.getUpcomingAppointments); // Phải trước /:id

// CRM routes - phải đặt trước /:id
router.get("/:id/crm", customerCRMCtrl.getCustomerCRM);
router.put("/:id/status", customerCRMCtrl.updateCustomerStatus);

// Appointments - routes với customer_id trong path (phải trước /:id)
router.post("/:customerId/appointments", customerCRMCtrl.createAppointment);
router.put("/:customerId/appointments/:id", customerCRMCtrl.updateAppointment);
router.delete("/:customerId/appointments/:id", customerCRMCtrl.deleteAppointment);

// Interactions - routes với customer_id trong path (phải trước /:id)
router.post("/:customerId/interactions", customerCRMCtrl.createInteraction);
router.delete("/:customerId/interactions/:id", customerCRMCtrl.deleteInteraction);

// Generic routes - phải đặt CUỐI CÙNG
router.get("/:id", customerCtrl.getById);
router.post("/", customerCtrl.create);
router.put("/:id", customerCtrl.update);
router.delete("/:id", customerCtrl.delete);

module.exports = router;






