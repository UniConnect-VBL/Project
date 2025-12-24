import { Router } from "express";

const router = Router();

router.post("/", (_req, res) => {
  res.status(501).json({ message: "TODO: create review" });
});

router.get("/", (_req, res) => {
  res.status(501).json({ message: "TODO: search reviews" });
});

export default router;


