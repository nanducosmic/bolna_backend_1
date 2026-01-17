"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const contact_controller_1 = require("../controllers/contact.controller");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// TEXT import
router.post("/import/text", contact_controller_1.importContactsText);
// EXCEL import
router.post("/import/excel", upload.single("file"), contact_controller_1.importContactsExcel);
// GET contacts
router.get("/", contact_controller_1.getContactsList);
exports.default = router;
