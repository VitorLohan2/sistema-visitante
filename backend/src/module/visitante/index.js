const VisitanteController = require("./modules/visitante/controllers/visitanteController");

routes.get("/visitantes", VisitanteController.index);
routes.post("/visitantes", VisitanteController.create);
routes.get("/visitantes/:id", VisitanteController.show);
routes.put("/visitantes/:id", VisitanteController.update);
routes.put("/visitantes/:id/block", VisitanteController.blockIncident);
routes.delete("/visitantes/:id", VisitanteController.delete);
