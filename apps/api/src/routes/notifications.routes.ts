import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(501).json({ message: "TODO: list notifications" });
});

router.put("/read", (_req, res) => {
  res.status(501).json({ message: "TODO: mark notifications read" });
});

export default router;


