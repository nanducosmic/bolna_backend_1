"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const agent_controller_1 = require("../controllers/agent.controller");
const router = express_1.default.Router();
router.post("/", agent_controller_1.saveAgent);
router.get("/", agent_controller_1.getAgent);
exports.default = router;
