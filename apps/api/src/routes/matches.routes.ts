import { Router } from "express";

const router = Router();

router.get("/suggestions", (_req, res) => {
  res.status(501).json({ message: "TODO: match suggestions" });
});

router.post("/swipe", (_req, res) => {
  res.status(501).json({ message: "TODO: swipe match" });
});

export default router;


