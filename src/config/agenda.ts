// src/config/agenda.ts
import Agenda from "agenda";

const mongoConnectionString = process.env.MONGO_URI || "mongodb://127.0.0.1/your-db";

/**
 * Stable configuration for Agenda.
 * Instead of passing a MongoClient collection, we pass the db object.
 * This allows Agenda to initialize the collection internally correctly.
 */
const agenda = new Agenda({
  db: { 
    address: mongoConnectionString, 
    collection: "agendaJobs" 
  },
  processEvery: "30 seconds"
});

export default agenda;