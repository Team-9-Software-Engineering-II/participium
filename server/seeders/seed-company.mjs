import db from "../models/index.mjs";

/**
 * Seeds the 'companies' table with external maintenance providers in Turin.
 */
export const seedCompanies = async () => {
  try {
    // Check if the table is already populated
    const count = await db.Company.count();
    if (count > 0) {
      return;
    }

    await db.Company.bulkCreate([
      {
        id: 1,
        name: "SMAT S.p.A.", // Società Metropolitana Acque Torino
        address: "Corso XI Febbraio, 14",
        city: "Torino",
        region: "Piemonte",
        country: "Italia",
      },
      {
        id: 2,
        name: "IREN Illuminazione Pubblica", // IREN Luce Gas e Servizi (gestione illuminazione)
        address: "Via Avogadro, 10",
        city: "Torino",
        region: "Piemonte",
        country: "Italia",
      },
      {
        id: 3,
        name: "AMIAT S.p.A.", // Azienda Multiservizi Igiene Ambientale Torino
        address: "Via Germagnano, 50",
        city: "Torino",
        region: "Piemonte",
        country: "Italia",
      },
      {
        id: 4,
        name: "GTT - Gruppo Trasporti", // Gestione semafori e segnaletica
        address: "Corso Turati, 19/21",
        city: "Torino",
        region: "Piemonte",
        country: "Italia",
      },
      {
        id: 5,
        name: "C.I.T. Servizi Urbani", // Azienda generica per manutenzione strade e arredo urbano
        address: "Via Frejus, 20",
        city: "Torino",
        region: "Piemonte",
        country: "Italia",
      },
    ]);

    console.log("Companies seeded successfully.");
  } catch (err) {
    console.error("Error seeding companies:", err);
    throw err;
  }
};
