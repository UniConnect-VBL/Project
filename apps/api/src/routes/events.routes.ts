import { Router } from "express";
import {
  createEvent,
  getEvents,
  buyTicket,
  getMyTickets,
} from "../controllers/events.controller.js";

const router = Router();

// Create event
router.post("/", createEvent);

// List events
router.get("/", getEvents);

// Buy ticket
router.post("/:id/ticket", buyTicket);

// Get my tickets
router.get("/tickets", getMyTickets);

export default router;
