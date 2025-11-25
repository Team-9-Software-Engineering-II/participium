import { findAllTechnicalOffices } from "../repositories/technical-office-repo.mjs";
import { filterToSimplifiedList } from "../shared/dto/technical-office-dto.mjs";
/**
 * Service class for TechnicalOffice operations.
 */
export class TechnicalOfficeService {
  /**
   * Retrieves all technical offices, filters the data to include only id and name,
   * and returns the result as a list of simplified objects.
   *
   * @returns {Promise<Array<{id: number, name: string}>>}
   */
  static async getAllSimplifiedTechnicalOffices() {
    const technicalOfficesWithRelations = await findAllTechnicalOffices();

    return filterToSimplifiedList(technicalOfficesWithRelations);
  }
}
