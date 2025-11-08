// Service factory - creates service instances with dependency injection
import { ApiClient, apiClient } from '../client';
import { PlayerService, PlayerServiceImpl } from './player.service';
import { GameService, GameServiceImpl } from './game.service';
import { SpeciesService, SpeciesServiceImpl } from './species.service';
import { CountryService, CountryServiceImpl } from './country.service';
import { LanguageService, LanguageServiceImpl } from './language.service';
import { TaxonomyService, TaxonomyServiceImpl } from './taxonomy.service';
import { ChallengeService, ChallengeServiceImpl } from './challenge.service';
import { FlagService, FlagServiceImpl } from './flag.service';

export interface Services {
  player: PlayerService;
  game: GameService;
  species: SpeciesService;
  country: CountryService;
  language: LanguageService;
  taxonomy: TaxonomyService;
  challenge: ChallengeService;
  flag: FlagService;
}

export function createServices(client: ApiClient = apiClient): Services {
  return {
    player: new PlayerServiceImpl(client),
    game: new GameServiceImpl(client),
    species: new SpeciesServiceImpl(client),
    country: new CountryServiceImpl(client),
    language: new LanguageServiceImpl(client),
    taxonomy: new TaxonomyServiceImpl(client),
    challenge: new ChallengeServiceImpl(client),
    flag: new FlagServiceImpl(client),
  };
}

// Default services instance
export const services = createServices();

