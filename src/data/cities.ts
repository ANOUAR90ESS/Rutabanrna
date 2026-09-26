import { City } from '../types/transit';

export const CITIES: City[] = [
  {
    id: 'barcelona',
    name: {
      es: 'Barcelona',
      en: 'Barcelona',
      ca: 'Barcelona',
      ar: 'برشلونة'
    },
    country: 'Spain',
    center: [41.3879, 2.16992],
    zoom: 13,
    status: 'active',
    systems: ['Metro TMB', 'Rodalies Renfe', 'FGC', 'Bus TMB', 'TRAM']
  },
  {
    id: 'madrid',
    name: {
      es: 'Madrid',
      en: 'Madrid',
      ca: 'Madrid',
      ar: 'مدريد'
    },
    country: 'Spain',
    center: [40.4168, -3.7038],
    zoom: 13,
    status: 'coming_soon',
    systems: ['Metro de Madrid', 'Cercanías Renfe', 'EMT Bus']
  },
  {
    id: 'valencia',
    name: {
      es: 'Valencia',
      en: 'Valencia',
      ca: 'València',
      ar: 'فالنسيا'
    },
    country: 'Spain',
    center: [39.4699, -0.3763],
    zoom: 13,
    status: 'coming_soon',
    systems: ['Metrovalencia', 'EMT Valencia', 'Renfe Cercanías']
  },
  {
    id: 'sevilla',
    name: {
      es: 'Sevilla',
      en: 'Seville',
      ca: 'Sevilla',
      ar: 'إشبيلية'
    },
    country: 'Spain',
    center: [37.3891, -5.9845],
    zoom: 13,
    status: 'coming_soon',
    systems: ['Metro de Sevilla', 'TUSSAM Bus', 'Cercanías Renfe']
  }
];
