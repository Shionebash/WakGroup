// WakGroup Character Creator â€” adapted to drive the ANM binary engine
// for the Huppermage female model. Other classes/genders are placeholders
// in the UI for now; only 'ironsworn' slot with female currently renders.

const { useState, useEffect, useMemo, useCallback, useRef } = React;
const { CLASSES, ELEMENT_COLORS, OUTFITS, HAIRSTYLES, SHARED_FEMALE_COSTUMES, ANIM_LIBS, GENDER_ANIM_LIBS, ANIMATIONS, RELIC_OVERLAYS, WEAPON_ANM_MAP } = window.CC_DATA;
const AURA_LIGHTS_FALLBACK = window.CC_AURA_LIGHTS || [];
const Icons = window.CCIcons;
const CC_ASSET_BASE = window.CC_ASSET_BASE || '/assets/character-creator';
const CC_API_BASE = window.CC_API_BASE || window.location.origin;
const ccAsset = (relativePath) => `${CC_ASSET_BASE}/${String(relativePath).replace(/^\/+/, '')}`;
const apiAsset = (relativePath) => `${CC_API_BASE}/${String(relativePath).replace(/^\/+/, '')}`;

const SUPPORTED_LANGUAGES = new Set(['es', 'en', 'fr', 'pt']);
const normalizeLanguage = (language) => {
  const raw = String(language || '').toLowerCase();
  const short = raw.split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(short) ? short : 'es';
};
const getInitialLanguage = () => {
  try {
    return normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
  } catch (err) {
    return 'es';
  }
};
const repairMojibake = (value) => {
  if (typeof value !== 'string') return value;
  let text = value;
  for (let pass = 0; pass < 2 && /[ÃÂ]/.test(text); pass += 1) {
    try {
      const bytes = Array.from(text, ch => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
      const decoded = decodeURIComponent(bytes);
      if (!decoded || decoded === text) break;
      text = decoded;
    } catch (err) {
      break;
    }
  }
  return text;
};
const localizedText = (value, language = 'es', fallback = '') => {
  if (!value) return repairMojibake(fallback);
  if (typeof value === 'string') return repairMojibake(value || fallback);
  const lang = normalizeLanguage(language);
  return repairMojibake(value[lang] || value.es || value.en || value.fr || value.pt || fallback);
};

function Icon({ name, ...rest }) {
  return <span {...rest} dangerouslySetInnerHTML={{ __html: Icons[name] || '' }} />;
}

const BG_OPTIONS = [
  { id: 'void', label: { es: 'Vacio', en: 'Void', fr: 'Vide', pt: 'Vazio' } },
  { id: 'sanctum', label: { es: 'Sanctum', en: 'Sanctum', fr: 'Sanctuaire', pt: 'Santuário' } },
  { id: 'forest', label: { es: 'Bosque', en: 'Forest', fr: 'Forêt', pt: 'Bosque' } },
  { id: 'ember', label: { es: 'Brasas', en: 'Embers', fr: 'Braises', pt: 'Brasas' } },
];

const CC_COPY = {
  es: {
    classEyebrow: 'Clase', classTitle: 'Senda', classSearch: 'Buscar por nombre o rol...',
    avatarEyebrow: 'Tu Avatar', unnamed: 'Sin nombre', noNameHero: 'Heroe sin nombre',
    random: 'Aleatorio', reset: 'Restaurar', savePng: 'Guardar PNG', levelHero: 'Lv 1 · Heroe',
    rotateLeft: 'Girar izquierda', resetRotation: 'Reiniciar', rotateRight: 'Girar derecha',
    summary: 'Resumen', focusedOn: 'enfocado en', hair: 'Peinado', armor: 'Armadura', costume: 'Traje',
    noCostume: 'Sin traje', classBase: 'Base de clase', activePalette: 'Paleta activa',
    baseClothes: 'Vestimenta base de la clase activa.', liveBase: 'Render base vivo para esta clase y genero.',
    appearance: 'Apariencia', customize: 'Personalizar', identity: 'Identidad', heroName: 'Nombre del heroe',
    heroNamePlaceholder: 'Escribe un nombre epico...', gender: 'Genero', female: 'Femenino', male: 'Masculino',
    animation: 'Animacion', movement: 'Movimiento', emotes: 'Emotes', weapons: 'Armas',
    face: 'Rostro', skinTone: 'Tono de piel', eyeColor: 'Color de ojos', hairColor: 'Color de cabello',
    realBaseNoHair: 'Esta clase usa su base ANM real sin peinados extra del creador de Hipermago.',
    wardrobe: 'Vestimenta', armorModel: 'Modelo de armadura', noOutfits: 'No encontre una familia de vestimentas emparejada para esta clase en los assets publicados.',
    available: 'Disponibles', status: 'Estado', fullView: 'Vista completa', noHelmet: 'Sin casco', withHelmet: 'Con casco',
    openWardrobe: 'Abrir vestidor', removeCostume: 'Quitar traje', noAdvancedWardrobe: 'Esta clase usa su base real y por ahora no comparte el navegador avanzado de trajes del creador.',
    components: 'componentes', component: 'componente', noEffect: 'sin efecto', noEffectTitle: 'Este canal no afecta al traje activo',
    channel1: 'Canal 1 - Tejido base', channel2: 'Canal 2 - Secundario', channel3: 'Canal 3 - Metalico', channel4: 'Canal 4 - Detalle A', channel5: 'Canal 5 - Detalle B', channel6: 'Canal 6 - Sombra',
    auras: 'Auras', equipmentAuras: 'Auras de equipo', noAura: 'Ninguna', saveAppearance: 'Guardar apariencia',
    wardrobeModal: 'Vestidor', wardrobeOf: 'Vestimenta de', closeWardrobe: 'Cerrar vestidor', catalog: 'catalogo', searchCostume: 'Buscar traje...', externalNoCostume: 'Sin traje externo',
    visualEquipment: 'Equipamiento visual', visual: 'Visual', equipment: 'Equipamiento', none: 'Ninguno', searchByName: 'Buscar por nombre...', loading: 'Cargando...', noResults: 'Sin resultados',
    preparingPng: 'Preparando PNG...', pngSaved: 'PNG guardado.', noCharacterExport: 'No hay personaje para exportar.', pngCreateError: 'No se pudo crear el PNG.', pngExportError: 'No se pudo exportar el PNG.',
    appearanceLoaded: 'Apariencia cargada desde WakGroup.', appearanceSaved: 'Apariencia guardada.', appearanceSaveError: 'No se pudo guardar la apariencia.', savingAppearance: 'Guardando apariencia...',
    element_fire: 'Fuego', element_water: 'Agua', element_earth: 'Tierra', element_air: 'Aire',
    betaTitle: 'Creador Visual — Beta Pública', betaSubtitle: 'Versión en desarrollo activo',
    betaIntro: 'Estás accediendo a una herramienta todavía en construcción. Aquí puedes diseñar la apariencia de tu personaje de Wakfu y guardarla en tu perfil de WakGroup — pero ten en cuenta lo siguiente antes de empezar:',
    betaItem1: 'Pueden aparecer errores visuales o comportamientos inesperados al cambiar de sección o equipar ciertos ítems.',
    betaItem2: 'No todas las clases, trajes o equipamientos están disponibles aún. El catálogo se ampliará con las actualizaciones.',
    betaItem3: 'Algunas funciones están marcadas como "en desarrollo" y no afectan por ahora a la apariencia guardada.',
    betaItem4: 'El formato de los datos de apariencia puede cambiar en versiones futuras. Las apariencias guardadas podrían necesitar reajuste.',
    betaItem5: 'Si el creador se comporta de forma extraña, recarga la página.',
    betaFeedback: 'Tu feedback es bienvenido — reporta errores o sugerencias en el Discord de WakGroup.',
    betaStart: 'Entendido, empezar',
  },
  en: {
    classEyebrow: 'Class', classTitle: 'Path', classSearch: 'Search by name or role...',
    avatarEyebrow: 'Your Avatar', unnamed: 'Unnamed', noNameHero: 'Unnamed hero',
    random: 'Random', reset: 'Reset', savePng: 'Save PNG', levelHero: 'Lv 1 · Hero',
    rotateLeft: 'Rotate left', resetRotation: 'Reset', rotateRight: 'Rotate right',
    summary: 'Summary', focusedOn: 'focused on', hair: 'Hair', armor: 'Armor', costume: 'Costume',
    noCostume: 'No costume', classBase: 'Class base', activePalette: 'Active palette',
    baseClothes: 'Base outfit for the active class.', liveBase: 'Live base render for this class and gender.',
    appearance: 'Appearance', customize: 'Customize', identity: 'Identity', heroName: 'Hero name',
    heroNamePlaceholder: 'Type an epic name...', gender: 'Gender', female: 'Female', male: 'Male',
    animation: 'Animation', movement: 'Movement', emotes: 'Emotes', weapons: 'Weapons',
    face: 'Face', skinTone: 'Skin tone', eyeColor: 'Eye color', hairColor: 'Hair color',
    realBaseNoHair: 'This class uses its real ANM base without extra Huppermage creator hairstyles.',
    wardrobe: 'Wardrobe', armorModel: 'Armor model', noOutfits: 'No matching outfit family was found for this class in the published assets.',
    available: 'Available', status: 'Status', fullView: 'Full view', noHelmet: 'No helmet', withHelmet: 'With helmet',
    openWardrobe: 'Open wardrobe', removeCostume: 'Remove costume', noAdvancedWardrobe: 'This class uses its real base and does not yet share the advanced costume browser.',
    components: 'components', component: 'component', noEffect: 'no effect', noEffectTitle: 'This channel does not affect the active costume',
    channel1: 'Channel 1 - Base fabric', channel2: 'Channel 2 - Secondary', channel3: 'Channel 3 - Metal', channel4: 'Channel 4 - Detail A', channel5: 'Channel 5 - Detail B', channel6: 'Channel 6 - Shadow',
    auras: 'Auras', equipmentAuras: 'Equipment auras', noAura: 'None', saveAppearance: 'Save appearance',
    wardrobeModal: 'Wardrobe', wardrobeOf: 'Wardrobe for', closeWardrobe: 'Close wardrobe', catalog: 'catalog', searchCostume: 'Search costume...', externalNoCostume: 'No external costume',
    visualEquipment: 'Visual equipment', visual: 'Visual', equipment: 'Equipment', none: 'None', searchByName: 'Search by name...', loading: 'Loading...', noResults: 'No results',
    preparingPng: 'Preparing PNG...', pngSaved: 'PNG saved.', noCharacterExport: 'No character to export.', pngCreateError: 'Could not create PNG.', pngExportError: 'Could not export PNG.',
    appearanceLoaded: 'Appearance loaded from WakGroup.', appearanceSaved: 'Appearance saved.', appearanceSaveError: 'Could not save appearance.', savingAppearance: 'Saving appearance...',
    element_fire: 'Fire', element_water: 'Water', element_earth: 'Earth', element_air: 'Air',
    betaTitle: 'Visual Creator — Public Beta', betaSubtitle: 'Active development version',
    betaIntro: 'You are accessing a tool that is still under construction. Here you can design your Wakfu character appearance and save it to your WakGroup profile — but please keep the following in mind before you start:',
    betaItem1: 'Visual glitches or unexpected behavior may occur when switching sections or equipping certain items.',
    betaItem2: 'Not all classes, outfits, or equipment are available yet. The catalog will expand with future updates.',
    betaItem3: 'Some features are marked as "in development" and do not currently affect your saved appearance.',
    betaItem4: 'The appearance data format may change in future versions. Saved appearances might need readjustment.',
    betaItem5: 'If the creator behaves oddly, reload the page.',
    betaFeedback: 'Your feedback is welcome — report bugs or suggestions in the WakGroup Discord.',
    betaStart: 'Got it, start',
  },
  fr: {
    classEyebrow: 'Classe', classTitle: 'Voie', classSearch: 'Rechercher par nom ou role...',
    avatarEyebrow: 'Ton avatar', unnamed: 'Sans nom', noNameHero: 'Heros sans nom',
    random: 'Aleatoire', reset: 'Reinitialiser', savePng: 'Enregistrer PNG', levelHero: 'Niv. 1 · Heros',
    rotateLeft: 'Tourner a gauche', resetRotation: 'Reinitialiser', rotateRight: 'Tourner a droite',
    summary: 'Resume', focusedOn: 'axe sur', hair: 'Coiffure', armor: 'Armure', costume: 'Costume',
    noCostume: 'Sans costume', classBase: 'Base de classe', activePalette: 'Palette active',
    baseClothes: 'Tenue de base de la classe active.', liveBase: 'Rendu de base pour cette classe et ce genre.',
    appearance: 'Apparence', customize: 'Personnaliser', identity: 'Identite', heroName: 'Nom du heros',
    heroNamePlaceholder: 'Ecris un nom epique...', gender: 'Genre', female: 'Feminin', male: 'Masculin',
    animation: 'Animation', movement: 'Mouvement', emotes: 'Emotes', weapons: 'Armes',
    face: 'Visage', skinTone: 'Teint', eyeColor: 'Couleur des yeux', hairColor: 'Couleur des cheveux',
    realBaseNoHair: 'Cette classe utilise sa base ANM reelle sans coiffures supplementaires.',
    wardrobe: 'Tenue', armorModel: 'Modele d armure', noOutfits: 'Aucune famille de tenue associee trouvee pour cette classe.',
    available: 'Disponibles', status: 'Etat', fullView: 'Vue complete', noHelmet: 'Sans casque', withHelmet: 'Avec casque',
    openWardrobe: 'Ouvrir le vestiaire', removeCostume: 'Retirer le costume', noAdvancedWardrobe: 'Cette classe utilise sa base reelle et ne partage pas encore le navigateur avance.',
    components: 'composants', component: 'composant', noEffect: 'sans effet', noEffectTitle: 'Ce canal n affecte pas le costume actif',
    channel1: 'Canal 1 - Tissu base', channel2: 'Canal 2 - Secondaire', channel3: 'Canal 3 - Metal', channel4: 'Canal 4 - Detail A', channel5: 'Canal 5 - Detail B', channel6: 'Canal 6 - Ombre',
    auras: 'Auras', equipmentAuras: 'Auras d equipement', noAura: 'Aucune', saveAppearance: 'Enregistrer apparence',
    wardrobeModal: 'Vestiaire', wardrobeOf: 'Tenue de', closeWardrobe: 'Fermer le vestiaire', catalog: 'catalogue', searchCostume: 'Rechercher costume...', externalNoCostume: 'Sans costume externe',
    visualEquipment: 'Equipement visuel', visual: 'Visuel', equipment: 'Equipement', none: 'Aucun', searchByName: 'Rechercher par nom...', loading: 'Chargement...', noResults: 'Aucun resultat',
    preparingPng: 'Preparation du PNG...', pngSaved: 'PNG enregistre.', noCharacterExport: 'Aucun personnage a exporter.', pngCreateError: 'Impossible de creer le PNG.', pngExportError: 'Impossible d exporter le PNG.',
    appearanceLoaded: 'Apparence chargee depuis WakGroup.', appearanceSaved: 'Apparence enregistree.', appearanceSaveError: 'Impossible d enregistrer l apparence.', savingAppearance: 'Enregistrement...',
    element_fire: 'Feu', element_water: 'Eau', element_earth: 'Terre', element_air: 'Air',
    betaTitle: 'Createur Visuel — Beta Publique', betaSubtitle: 'Version en developpement actif',
    betaIntro: 'Vous accedez a un outil encore en construction. Vous pouvez concevoir l apparence de votre personnage Wakfu et la sauvegarder sur votre profil WakGroup — mais gardez ceci a l esprit avant de commencer :',
    betaItem1: 'Des bugs visuels ou comportements inattendus peuvent survenir lors du changement de section ou de l equipement de certains elements.',
    betaItem2: 'Toutes les classes, tenues ou equipements ne sont pas encore disponibles. Le catalogue s agrandira avec les mises a jour.',
    betaItem3: 'Certaines fonctions sont marquees comme "en developpement" et n affectent pas encore l apparence sauvegardee.',
    betaItem4: 'Le format des donnees d apparence peut changer dans les versions futures. Les apparences sauvegardees pourraient necessiter un reajustement.',
    betaItem5: 'Si le createur se comporte bizarrement, rechargez la page.',
    betaFeedback: 'Votre retour est le bienvenu — signalez les bugs ou suggestions sur le Discord WakGroup.',
    betaStart: 'Compris, commencer',
  },
  pt: {
    classEyebrow: 'Classe', classTitle: 'Caminho', classSearch: 'Buscar por nome ou funcao...',
    avatarEyebrow: 'Seu Avatar', unnamed: 'Sem nome', noNameHero: 'Heroi sem nome',
    random: 'Aleatorio', reset: 'Restaurar', savePng: 'Salvar PNG', levelHero: 'Nv. 1 · Heroi',
    rotateLeft: 'Girar a esquerda', resetRotation: 'Reiniciar', rotateRight: 'Girar a direita',
    summary: 'Resumo', focusedOn: 'focado em', hair: 'Cabelo', armor: 'Armadura', costume: 'Traje',
    noCostume: 'Sem traje', classBase: 'Base da classe', activePalette: 'Paleta ativa',
    baseClothes: 'Roupa base da classe ativa.', liveBase: 'Render base vivo para esta classe e genero.',
    appearance: 'Aparencia', customize: 'Personalizar', identity: 'Identidade', heroName: 'Nome do heroi',
    heroNamePlaceholder: 'Digite um nome epico...', gender: 'Genero', female: 'Feminino', male: 'Masculino',
    animation: 'Animacao', movement: 'Movimento', emotes: 'Emotes', weapons: 'Armas',
    face: 'Rosto', skinTone: 'Tom de pele', eyeColor: 'Cor dos olhos', hairColor: 'Cor do cabelo',
    realBaseNoHair: 'Esta classe usa sua base ANM real sem penteados extras do criador de Hipermago.',
    wardrobe: 'Vestuário', armorModel: 'Modelo de armadura', noOutfits: 'Nao encontrei uma familia de roupas pareada para esta classe nos assets publicados.',
    available: 'Disponiveis', status: 'Estado', fullView: 'Vista completa', noHelmet: 'Sem capacete', withHelmet: 'Com capacete',
    openWardrobe: 'Abrir guarda-roupa', removeCostume: 'Remover traje', noAdvancedWardrobe: 'Esta classe usa sua base real e ainda nao compartilha o navegador avancado de trajes.',
    components: 'componentes', component: 'componente', noEffect: 'sem efeito', noEffectTitle: 'Este canal nao afeta o traje ativo',
    channel1: 'Canal 1 - Tecido base', channel2: 'Canal 2 - Secundario', channel3: 'Canal 3 - Metal', channel4: 'Canal 4 - Detalhe A', channel5: 'Canal 5 - Detalhe B', channel6: 'Canal 6 - Sombra',
    auras: 'Auras', equipmentAuras: 'Auras de equipamento', noAura: 'Nenhuma', saveAppearance: 'Salvar aparencia',
    wardrobeModal: 'Guarda-roupa', wardrobeOf: 'Vestuário de', closeWardrobe: 'Fechar guarda-roupa', catalog: 'catalogo', searchCostume: 'Buscar traje...', externalNoCostume: 'Sem traje externo',
    visualEquipment: 'Equipamento visual', visual: 'Visual', equipment: 'Equipamento', none: 'Nenhum', searchByName: 'Buscar por nome...', loading: 'Carregando...', noResults: 'Sem resultados',
    preparingPng: 'Preparando PNG...', pngSaved: 'PNG salvo.', noCharacterExport: 'Nao ha personagem para exportar.', pngCreateError: 'Nao foi possivel criar o PNG.', pngExportError: 'Nao foi possivel exportar o PNG.',
    appearanceLoaded: 'Aparencia carregada do WakGroup.', appearanceSaved: 'Aparencia salva.', appearanceSaveError: 'Nao foi possivel salvar a aparencia.', savingAppearance: 'Salvando aparencia...',
    element_fire: 'Fogo', element_water: 'Agua', element_earth: 'Terra', element_air: 'Ar',
    betaTitle: 'Criador Visual — Beta Publica', betaSubtitle: 'Versao em desenvolvimento ativo',
    betaIntro: 'Voce esta acessando uma ferramenta que ainda esta em construcao. Aqui voce pode criar a aparencia do seu personagem Wakfu e salva-la no seu perfil WakGroup — mas tenha em mente o seguinte antes de comecar:',
    betaItem1: 'Podem aparecer erros visuais ou comportamentos inesperados ao mudar de secao ou equipar certos itens.',
    betaItem2: 'Nao todas as classes, roupas ou equipamentos estao disponiveis ainda. O catalogo sera ampliado com atualizacoes futuras.',
    betaItem3: 'Algumas funcoes estao marcadas como "em desenvolvimento" e por enquanto nao afetam a aparencia salva.',
    betaItem4: 'O formato dos dados de aparencia pode mudar em versoes futuras. As aparencias salvas podem precisar de reajuste.',
    betaItem5: 'Se o criador se comportar de forma estranha, recarregue a pagina.',
    betaFeedback: 'Seu feedback e bem-vindo — relate bugs ou sugestoes no Discord do WakGroup.',
    betaStart: 'Entendido, comecar',
  },
};

const KNOWN_SHARED_PARTS = new Set([
  'Chapeau', 'Cape', 'CapeBas', 'CorpsHabit', 'Epaulette-G', 'Epaulette-D',
  'JambeHabit', 'PiedHabit01', 'PiedHabit02', 'CuisseHabit',
]);

// Equipment slot configuration
let _equipCatalog = null;
const getEquipCatalog = async () => {
  if (!_equipCatalog) {
    const r = await fetch(`${CC_API_BASE}/character-creator/equipment`);
    const payload = await r.json();
    _equipCatalog = payload.itemsBySlot || {};
  }
  return _equipCatalog;
};

const SLOT_PARTS = {
  HEAD:          ['Chapeau', 'Chapeau02', 'Barbe'],
  CHEST:         ['CorpsHabit', 'CuisseHabit'],
  SHOULDERS:     ['Epaulette-G', 'Epaulette-D'],
  LEGS:          ['JambeHabit', 'PiedHabit01', 'PiedHabit02', 'CuisseHabit'],
  BACK:          ['Cape', 'CapeBas'],
  FIRST_WEAPON:  ['Arme'],
  SECOND_WEAPON: ['Bouclier'],
};
const SLOT_ORDER = ['FIRST_WEAPON', 'SECOND_WEAPON', 'HEAD', 'CHEST', 'SHOULDERS', 'LEGS', 'BACK'];
const SLOT_LABELS = {
  FIRST_WEAPON:  { es: 'Arma', en: 'Weapon', fr: 'Arme', pt: 'Arma' },
  SECOND_WEAPON: { es: 'Arma', en: 'Off hand', fr: 'Main 2', pt: 'Mao 2' },
  HEAD:          { es: 'Casco', en: 'Helmet', fr: 'Casque', pt: 'Capacete' },
  CHEST:         { es: 'Peto', en: 'Chest', fr: 'Plastron', pt: 'Peitoral' },
  SHOULDERS:     { es: 'Hombreras', en: 'Shoulders', fr: 'Epaules', pt: 'Ombreiras' },
  LEGS:          { es: 'Botas', en: 'Boots', fr: 'Bottes', pt: 'Botas' },
  BACK:          { es: 'Capa', en: 'Cloak', fr: 'Cape', pt: 'Capa' },
};

// javaHashCode â€” matches engine's javaHashCode for pre-computing CRCs from
// part name strings (used by the "hide helmet" toggle to suppress costume
// helmet sprites by baseNameCRC).
function javaHashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

// Pre-computed baseNameCRCs for costume helmet/head parts suppressed by the
// "hide helmet" toggle. Covers: hat sprites (Chapeau, Chapeau02), face piece
// (Barbe), and costume-owned hair (CheveuxHaut/Bas/Arriere, braids).
// Derived from EquipmentType.HEAD + AnmPartHelper.CHEVEUX_CUSTOM in the
// decompiled game source. Using a shared frozen Set is safe because
// suppressedBaseNameCRCs is only read, never mutated, by the engine.
const HAIR_PART_NAMES = [
  'CheveuxHaut', 'CheveuxBas', 'CheveuxArriere',
  'CheveuxNatteBasse', 'CheuveuxNatteHaute', 'Natte',
];
const HELMET_PART_NAMES = ['Chapeau', 'Chapeau02', 'Barbe', ...HAIR_PART_NAMES];
const HAIR_SUPPRESS_CRCS = new Set(HAIR_PART_NAMES.map(javaHashCode));
const HELMET_SUPPRESS_CRCS = new Set(HELMET_PART_NAMES.map(javaHashCode));
const HUPPERMAGE_CLASS_ID = 'huppermage';
const RENDER_DPR_CAP = 2.25;
const CHARACTER_RENDER_SCALE = 1.3;

// Weapon type IDs that have AnimStatique03-Boucle-{typeId} in every player ANM.
// typeId = Math.floor(gfxId / 100000).  Starter weapons (10, 11, 25) are absent → fall back to AnimStatique.
const WEAPON_STANCE_TYPE_IDS = new Set([101,108,110,111,112,113,114,115,117,219,223,253,254]);

function weaponTypeIdFromState(state) {
  const fw = state.equipment?.FIRST_WEAPON;
  if (!fw) return null;
  const gfx = (state.gender === 'female' && fw.femaleGfxId) ? fw.femaleGfxId : fw.gfxId;
  return Math.floor(gfx / 100000);
}

// When idle is selected and a weapon with a known stance is equipped, automatically
// use AnimStatique03-Boucle-{typeId} so the Arme sprite slot becomes active and
// the weapon equipment overlay renders correctly.
function resolveAnimKey(state, animations) {
  const entry = animations.find(a => a.id === state.animation) || animations[0];
  const typeId = weaponTypeIdFromState(state);
  if (state.animation === 'idle') {
    if (typeId && WEAPON_STANCE_TYPE_IDS.has(typeId)) {
      return `AnimStatique03-Boucle-${typeId}`;
    }
  }
  if (state.animation === 'atk') {
    if (typeId === 219) return 'AnimHit';
    if (typeId && WEAPON_STANCE_TYPE_IDS.has(typeId)) return `AnimHit-${typeId}`;
    return 'AnimHit'; // unarmed fallback
  }
  return entry.animKey;
}

const genderBadge = (gender) => gender === 'female' ? 'F' : 'M';
const copyFor = (language) => CC_COPY[normalizeLanguage(language)] || CC_COPY.es;
const ccText = (language, key) => copyFor(language)[key] || CC_COPY.es[key] || key;
const genderLabel = (gender, language = 'es') => gender === 'female' ? ccText(language, 'female') : ccText(language, 'male');
const elementLabel = (element, language = 'es') => ccText(language, `element_${element}`) || ELEMENT_COLORS[element]?.label || element;
const animLabel = (animation, language = 'es') => {
  const labels = {
    idle: { es: 'Estatua', en: 'Statue', fr: 'Statue', pt: 'Estatua' },
    walk: { es: 'Caminar', en: 'Walk', fr: 'Marcher', pt: 'Caminhar' },
    run: { es: 'Correr', en: 'Run', fr: 'Courir', pt: 'Correr' },
    jump: { es: 'Saltar', en: 'Jump', fr: 'Sauter', pt: 'Saltar' },
    levelup: { es: 'Nivel+', en: 'Level+', fr: 'Niveau+', pt: 'Nivel+' },
    dormir: { es: 'Dormir', en: 'Sleep', fr: 'Dormir', pt: 'Dormir' },
    clap: { es: 'Aplaudir', en: 'Clap', fr: 'Applaudir', pt: 'Aplaudir' },
    yawn: { es: 'Bostezar', en: 'Yawn', fr: 'Bailler', pt: 'Bocejar' },
    drink: { es: 'Beber', en: 'Drink', fr: 'Boire', pt: 'Beber' },
    arms: { es: 'Brazos', en: 'Arms', fr: 'Bras', pt: 'Bracos' },
    defeat: { es: 'Derrota', en: 'Defeat', fr: 'Defaite', pt: 'Derrota' },
    no: { es: 'Negar', en: 'No', fr: 'Non', pt: 'Nao' },
    point: { es: 'Senalar', en: 'Point', fr: 'Pointer', pt: 'Apontar' },
    read: { es: 'Leer', en: 'Read', fr: 'Lire', pt: 'Ler' },
    scratch: { es: 'Rascarse', en: 'Scratch', fr: 'Se gratter', pt: 'Cocar' },
    coin: { es: 'Moneda', en: 'Coin', fr: 'Piece', pt: 'Moeda' },
    flirt: { es: 'Coquetear', en: 'Flirt', fr: 'Aguicher', pt: 'Paquerar' },
    angry: { es: 'Enojada', en: 'Angry', fr: 'Colere', pt: 'Brava' },
    wave: { es: 'Saludar', en: 'Wave', fr: 'Saluer', pt: 'Acenar' },
    scared: { es: 'Asustada', en: 'Scared', fr: 'Effrayee', pt: 'Assustada' },
    laugh: { es: 'Reir', en: 'Laugh', fr: 'Rire', pt: 'Rir' },
    victory: { es: 'Victoria', en: 'Victory', fr: 'Victoire', pt: 'Vitoria' },
    search: { es: 'Buscar', en: 'Search', fr: 'Chercher', pt: 'Buscar' },
    atk: { es: 'Ataque', en: 'Attack', fr: 'Attaque', pt: 'Ataque' },
  };
  return localizedText(labels[animation.id], language, repairMojibake(animation.label));
};

function ClassIcon({ classData, gender }) {
  return (
    <span className="cc-class-sigil" style={{ color: classData.accent }}>
      <img src={classData.iconPath} alt="" draggable={false} />
      <span className={'cc-class-gender-badge cc-class-gender-badge--' + gender}>{genderBadge(gender)}</span>
    </span>
  );
}

const buildSharedCostumeLayers = (sharedCostumeId, hideHelmet = false, gender = 'female') => {
  if (!sharedCostumeId || sharedCostumeId === 'none') return [];
  const bundle = SHARED_FEMALE_COSTUMES.find(item => item.id === sharedCostumeId);
  if (!bundle) return [];
  const components = (gender === 'male' && bundle.maleComponents)
    ? bundle.maleComponents
    : (gender === 'female' && bundle.femaleComponents)
    ? bundle.femaleComponents
    : bundle.components;
  return components.map((component, index) => {
    const filteredParts = (component.parts || []).filter(part => KNOWN_SHARED_PARTS.has(part));
    const layer = {
      id: `${bundle.id}_${component.appearanceId}_${index}`,
      anmPath: component.anmPath,
      atlasPath: component.atlasPath,
      role: 'equipment',
      isCostume: true,   // gates the helmet-fallback in _rebuildEquipmentOverrides
    };
    if (filteredParts.length) layer.parts = filteredParts;
    // When the user toggles "hide helmet", suppress all costume sprites whose
    // baseNameCRC matches a known helmet/head part (HELMET_SUPPRESS_CRCS above).
    // The engine will also retract the canHidePart triggers those sprites
    // contributed, so the base character's own hair re-appears underneath.
    if (hideHelmet) {
      layer.suppressedBaseNameCRCs = HELMET_SUPPRESS_CRCS;
    } else if (component.preservePlayerHair) {
      layer.suppressedBaseNameCRCs = HAIR_SUPPRESS_CRCS;
      layer.preservePlayerHair = true;
    }
    return layer;
  });
};

const buildEquipmentLayers = (equipment, gender) => {
  if (!equipment) return [];
  return SLOT_ORDER.flatMap(slot => {
    const item = equipment[slot];
    if (!item) return [];
    const gfx = (gender === 'female' && item.femaleGfxId) ? item.femaleGfxId : item.gfxId;
    return [{
      id: `equip_${slot}_${gfx}`,
      anmPath: ccAsset(`equipments/equipments/${gfx}.anm`),
      atlasPath: ccAsset(`equipments/equipments/Atlas/${gfx}_0.png`),
      role: 'equipment',
      parts: SLOT_PARTS[slot] || [],
    }];
  });
};

// Build the full layer manifest passed to AnmEngine.load() / reload().
// Mirror Wakfu's CharacterInfo.applyParts order: dress first, hair second.
// Later applyParts() calls win when both assets define the same named sprite.
//
// Hair + costume coexistence: the hair layer always loads. When a costume ANM
// defines its own Cheveux* sprites (e.g. costume 34718105 defines CheveuxHaut),
// the engine's override map gives those priority over the base hair because the
// costume layer loads AFTER the hair layer â€” so the costume's own hair renders,
// not the character's. For costumes that don't define CheveuxHaut/Bas (the vast
// majority), the character's chosen hairstyle shows alongside the costume as
// intended by the game â€” confirmed by visual inspection (screenshot).
const buildRelicOverlayLayer = (relicOverlayId, gender) => {
  if (!relicOverlayId || relicOverlayId === 'none') return [];
  const relic = RELIC_OVERLAYS.find(r => r.id === relicOverlayId);
  if (!relic) return [];
  const paths = gender === 'male' ? relic.male : relic.female;
  return [{
    id: `relic_${relicOverlayId}`,
    anmPath: paths.anmPath,
    atlasPath: paths.atlasPath,
    role: 'equipment',
    isCostume: true,
  }];
};

const resolveGenderedAppearance = (appearanceId) => ({
  anmPath: ccAsset(`equipments/equipments/${appearanceId}.anm`),
  atlasPath: ccAsset(`equipments/equipments/Atlas/${appearanceId}_0.png`),
});

const buildAnimLibLayers = (gender, animationId) => {
  const libs = new Map();
  const sittingLibByAnimation = {
    assis1: 'assis01',
    assis2: 'assis02',
    assis3: 'assis03',
    assis4: 'assis04',
    assis5: 'assis05',
    assis6: 'assis06',
    assis7: 'assis07',
    assis8: 'assis08',
    assis10: 'assis10',
    assis11: 'assis11',
  };
  const add = (libId) => {
    const lib = [...ANIM_LIBS, ...(GENDER_ANIM_LIBS[gender] || [])].find(item => item.id === libId);
    if (lib) libs.set(lib.id, { ...lib, role: 'animlib' });
  };

  if (['walk', 'run', 'jump', 'levelup'].includes(animationId)) add('commons');
  if (['repos', 'clap', 'yawn', 'drink', 'arms', 'defeat', 'no', 'point', 'read', 'scratch', 'coin'].includes(animationId)) add('emotes01');
  if (animationId === 'repos') add('assis_base');
  if (animationId === 'dormir') add('mkt23_dormir');
  if (animationId === 'zen') add('mkt16_zen');
  if (sittingLibByAnimation[animationId]) {
    add('assis_base');
    add(sittingLibByAnimation[animationId]);
  }
  if (['flirt', 'angry', 'wave', 'scared', 'laugh', 'victory', 'search'].includes(animationId)) add(gender === 'male' ? 'emotesmale' : 'emotesfem');

  return Array.from(libs.values());
};

const outfitForGender = (outfit, gender) => (
  gender === 'male' ? outfit?.maleEquipId : outfit?.femaleEquipId
);

const buildManifest = (classData, state) => {
  const variant = classData?.variants?.[state.gender];
  if (!variant) return [];
  const outfit = OUTFITS.find(o => o.id === state.outfitId && o.classId === classData.id) || null;
  const outfitAppearanceId = outfitForGender(outfit, state.gender);

  const baseOverride = outfit?.baseOverride?.[state.gender];
  const manifest = [
    {
      id: 'base',
      anmPath:   baseOverride ? baseOverride.anmPath   : variant.baseAnmPath,
      atlasPath: baseOverride ? baseOverride.atlasPath : variant.baseAtlasPath,
      role: 'base',
    },
  ];

  if (outfitAppearanceId) {
    const layer = resolveGenderedAppearance(outfitAppearanceId);
    manifest.push({ id: 'equip', anmPath: layer.anmPath, atlasPath: layer.atlasPath, role: 'equipment' });
  }

  manifest.push(...buildEquipmentLayers(state.equipment, state.gender));

  if (classData.supportsAdvancedCustomization) {
    const hairClassId = outfit?.hairFamilyOverride || classData.id;
    const hair = HAIRSTYLES.find(h => h.id === state.hairStyleId && h.classId === hairClassId)
      || HAIRSTYLES.find(h => h.classId === hairClassId)
      || null;
    const hairAppearanceId = state.gender === 'male' ? hair?.maleAppearanceId : hair?.femaleAppearanceId;

    if (hairAppearanceId) {
      const layer = resolveGenderedAppearance(hairAppearanceId);
      const hairEntry = { id: 'hair', anmPath: layer.anmPath, atlasPath: layer.atlasPath, role: 'equipment' };
      if (outfitAppearanceId) hairEntry.partGroup = 'CHEVEUXCUSTOM';
      manifest.push(hairEntry);
    }

    manifest.push(...buildSharedCostumeLayers(state.sharedCostumeId, state.hideHelmet, state.gender));
  }

  manifest.push(...buildRelicOverlayLayer(state.relicOverlayId, state.gender));
  manifest.push(...buildAnimLibLayers(state.gender, state.animation));

  // If a weapon with a known stance is equipped, add its animation file as an
  // animlib layer so AnimStatique03-Boucle-{typeId} and AnimHit-{typeId} resolve.
  const weapTypeId = weaponTypeIdFromState(state);
  if (weapTypeId && WEAPON_ANM_MAP[weapTypeId]) {
    manifest.push({ ...WEAPON_ANM_MAP[weapTypeId], role: 'animlib' });
  }

  return manifest;
};

const DEFAULTS = {
  classId: HUPPERMAGE_CLASS_ID,
  gender: 'female',
  animation: 'idle',
  animCat: 'move',
  outfitId: 'huppermage_outfit_100',
  sharedCostumeId: 'none',
  hideHelmet: false,
  relicOverlayId: 'none',
  auraLightsId: 'none',
  hairStyleId: 'hair1',
  equipment: {},
  skinColor: '#f4ca8a',
  hairColor: '#fde9c6',
  eyeColor: '#44bfc1',
  // Outfit color channels â€” each maps to one ColorCostume slot in the ANM.
  // Slot 9 (base Vetement fabric) mirrors costume1.
  // Slots 10-15 (ColorCostume1â€“6) each overlay EVERY equipment piece with a
  // different material zone, so all 6 are visually independent on the model.
  costume1: '#c9c7bd',   // slot 10 â€” primary zone (+ slot 9 base fabric)
  costume2: '#2f7c84',   // slot 11 â€” secondary zone
  costume3: '#c9c7bd',   // slot 12 â€” tertiary / metal accents
  costume4: '#2f7c84',   // slot 13 â€” detail A
  costume5: '#c9a514',   // slot 14 â€” detail B
  costume6: '#4d8e8e',   // slot 15 â€” dark / shadow zone
  symbolFg: '#f1c056',
  symbolBg: '#2a2014',
  name: 'Aeliana',
  bg: 'void',
};

const OUTFIT_COLOR_KEYS = ['costume1', 'costume2', 'costume3', 'costume4', 'costume5', 'costume6'];
const OUTFIT_PALETTE_STORAGE_KEY = 'wakxy.characterCreator.outfitPalettes.v1';

const makeOutfitPaletteKey = (classId, gender, outfitId) => `${classId}/${gender}/${outfitId}`;

const pickOutfitColors = (state) => OUTFIT_COLOR_KEYS.reduce((acc, key) => {
  acc[key] = state[key];
  return acc;
}, {});

const readStoredOutfitPalettes = () => {
  try {
    const raw = window.localStorage?.getItem(OUTFIT_PALETTE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.palettes === 'object' ? parsed.palettes : {};
  } catch (err) {
    console.warn('[CC] outfit palette load failed:', err);
    return {};
  }
};

const writeStoredOutfitPalettes = (palettes) => {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    palettes,
  };
  window.localStorage?.setItem(OUTFIT_PALETTE_STORAGE_KEY, JSON.stringify(payload, null, 2));
  return payload;
};

// Rotation (deg) â†’ 8-direction isometric index used by the ANM files.
// Direction enum (framework Direction8):
//   0=EAST, 1=SOUTH_EAST, 2=SOUTH, 3=SOUTH_WEST, 4=WEST,
//   5=NORTH_WEST, 6=NORTH, 7=NORTH_EAST.
// Base (rot=0) should face the camera, i.e. SOUTH = 2.
const ROT_TO_DIR = (rot) => {
  const steps = Math.round(((rot % 360) + 360) % 360 / 45);
  return (2 + steps) & 7;
};

function normalizeAuraEntry(entry) {
  if (!entry) return null;
  return {
    ...entry,
    name: repairMojibake(entry.name),
    anmPath: entry.anmPath || (entry.anmId != null ? ccAsset(`assets/aura_overlays/${entry.id}.anm`) : null),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, src });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadFirstImage(candidates) {
  for (const src of candidates) {
    try {
      return await loadImage(src);
    } catch (err) {
      // Try the next candidate path.
    }
  }
  throw new Error(`No texture candidates loaded: ${candidates.join(', ')}`);
}

function buildXpsTextureCandidates(particleId, xpsData) {
  const candidates = [ccAsset(`assets/aura_textures/${particleId}.png`)];
  const textureId = xpsData?.texture_id;
  if (textureId != null) {
    candidates.push(ccAsset(`assets/aura_textures/${textureId}.png`));
    candidates.push(ccAsset(`assets/relic_aura_textures/${textureId}.png`));
    candidates.push(ccAsset(`assets/relic_aura_textures/tex_${textureId}.png`));
  }
  return [...new Set(candidates)];
}

function HexPicker({ value, onChange }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div className="cc-hex-picker">
      <label className="cc-hex-swatch" style={{ background: safe }}>
        <input
          type="color"
          value={safe}
          onChange={e => onChange(e.target.value)}
        />
      </label>
      <span className="cc-hex-hash">#</span>
      <input
        type="text"
        className="cc-hex-input"
        value={value.replace('#', '').toUpperCase()}
        maxLength={6}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
          onChange('#' + v.toLowerCase());
        }}
        placeholder="D4A574"
      />
    </div>
  );
}

const SLOT_ICONS = {
  HEAD:          'helmet',
  BACK:          'cape',
  CHEST:         'shield',
  SHOULDERS:     'glove',
  LEGS:          'boot',
  FIRST_WEAPON:  'sword',
  SECOND_WEAPON: 'shield',
};

function EquipmentItemIcon({ item, label }) {
  const [broken, setBroken] = useState(false);
  const src = item?.iconPath ? apiAsset(item.iconPath) : '';
  if (!src || broken) {
    return <span className="cc-equip-card-fallback">{label.slice(0, 1) || '?'}</span>;
  }
  return <img src={src} alt="" className="cc-equip-card-img" draggable={false} onError={() => setBroken(true)} />;
}

function EquippedSlotIcon({ item, slot }) {
  const [broken, setBroken] = useState(false);
  if (item?.iconPath && !broken) {
    return <img src={apiAsset(item.iconPath)} alt="" className="cc-slot-img" draggable={false} onError={() => setBroken(true)} />;
  }
  return <Icon name={SLOT_ICONS[slot]} />;
}

function EquipmentPopover({ equipment, language, onSlotChange, activeSlot, onClose }) {
  const [catalog, setCatalog] = useState(null);
  const [search, setSearch] = useState('');
  const copy = copyFor(language);

  useEffect(() => {
    getEquipCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    setSearch('');
  }, [activeSlot]);

  const items = catalog ? (catalog[activeSlot] || []) : [];
  const query = search.trim().toLowerCase();
  const filtered = search.trim()
    ? items.filter(it => {
        const name = localizedText(it.title, language, it.name || '').toLowerCase();
        const type = localizedText(it.itemTypeName, language, '').toLowerCase();
        return name.includes(query) || type.includes(query);
      })
    : items;
  const selected = equipment[activeSlot];
  const slotLabel = localizedText(SLOT_LABELS[activeSlot], language, activeSlot);

  return (
    <div className="cc-equip-popover" role="dialog" aria-label={slotLabel}>
      <div className="cc-equip-popover-head">
        <div>
          <small>{copy.equipment}</small>
          <strong>{slotLabel}</strong>
        </div>
        <div className="cc-equip-actions">
          {selected && (
            <button className="cc-equip-clear" onClick={() => onSlotChange(activeSlot, null)}>
              {copy.none}
            </button>
          )}
          <button className="cc-equip-close" onClick={onClose} title="Cerrar">x</button>
        </div>
      </div>
      <div className="cc-equip-list-wrap">
        <input
          className="cc-equip-search"
          type="text"
          placeholder={copy.searchByName}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {!catalog && <div className="cc-equip-loading">{copy.loading}</div>}
        {catalog && (
          <div className="cc-equip-list">
            {filtered.map(it => {
              const itemName = localizedText(it.title, language, it.name || `Item ${it.id}`);
              return (
                <button
                  key={it.id}
                  className={'cc-equip-item' + (selected?.id === it.id ? ' active' : '')}
                  onClick={() => onSlotChange(activeSlot, it)}
                  title={`${itemName} · Nv.${it.level}`}
                >
                  <span className="cc-equip-card-icon"><EquipmentItemIcon item={it} label={itemName} /></span>
                  <span className="cc-equip-item-name">{itemName}</span>
                  <span className="cc-equip-item-level">Nv.{it.level}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="cc-equip-empty">{copy.noResults}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCreator() {
  const [state, setState] = useState(DEFAULTS);
  const [auraCatalog, setAuraCatalog] = useState(() => AURA_LIGHTS_FALLBACK.map(normalizeAuraEntry).filter(Boolean));
  const [classQuery, setClassQuery] = useState('');
  const [costumeSearch, setCostumeSearch] = useState('');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [betaModalOpen, setBetaModalOpen] = useState(() => {
    try { return !localStorage.getItem('cc_beta_seen'); } catch { return true; }
  });
  const [openSection, setOpenSection] = useState('identity');
  const [equipActiveSlot, setEquipActiveSlot] = useState(SLOT_ORDER[0]);
  const [equipPopoverOpen, setEquipPopoverOpen] = useState(false);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [rotation, setRotation] = useState(0);
  const [outfitPalettes, setOutfitPalettes] = useState(readStoredOutfitPalettes);
  const [paletteImportText, setPaletteImportText] = useState('');
  const [paletteStatus, setPaletteStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [pngDefaultPalettes, setPngDefaultPalettes] = useState(null);
  const set = useCallback((patch) => setState(s => ({ ...s, ...patch })), []);

  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const auraEngineRef = useRef(null);       // secondary engine for ANM-based auras
  const auraEngineReadyRef = useRef(false); // true once aura engine has loaded its manifest
  const xpsRendererRef = useRef(null);       // XPS particle system renderer
  const xpsDataRef = useRef(null);           // Loaded XPS catalog data
  const [xpsReady, setXpsReady] = useState(false); // Trigger re-render when XPS catalog loads
  const rafRef = useRef(null);
  const startTsRef = useRef(null);
  const stateRef = useRef(state);
  const rotationRef = useRef(rotation);
  const auraCatalogRef = useRef(auraCatalog);
  const auraLoadVersionRef = useRef(0);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { auraCatalogRef.current = auraCatalog; }, [auraCatalog]);

  useEffect(() => {
    const onMessage = (event) => {
      const message = event.data || {};
      if (message.type === 'wakgroup:appearance-load' && message.appearance) {
        setState(current => ({ ...current, ...message.appearance }));
        if (typeof message.appearance.rotation === 'number') setRotation(message.appearance.rotation);
        setSaveStatus(ccText(normalizeLanguage(message.language || language), 'appearanceLoaded'));
      }
      if (message.type === 'wakgroup:creator-config') {
        setLanguage(normalizeLanguage(message.language));
      }
      if (message.type === 'wakgroup:appearance-save-result') {
        setSaveStatus(message.ok ? ccText(language, 'appearanceSaved') : (message.error || ccText(language, 'appearanceSaveError')));
      }
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'wakgroup:creator-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const saveToWakGroup = useCallback(() => {
    window.parent?.postMessage({
      type: 'wakgroup:appearance-save',
      appearance: {
        ...stateRef.current,
        rotation: rotationRef.current,
        savedAt: new Date().toISOString(),
      },
    }, window.location.origin);
    setSaveStatus(ccText(language, 'savingAppearance'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(ccAsset('assets/wakfu_default_palettes.json'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data) setPngDefaultPalettes(data);
      })
      .catch(err => console.warn('[CC] Failed to load default palette JSON:', err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!wardrobeOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setWardrobeOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [wardrobeOpen]);

  useEffect(() => {
    if (!equipPopoverOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setEquipPopoverOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [equipPopoverOpen]);

  useEffect(() => {
    let cancelled = false;

    fetch(ccAsset('assets/aura_lights_catalog.json'))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data.items || [];
        setAuraCatalog(items.map(normalizeAuraEntry).filter(Boolean));
      })
      .catch(err => {
        console.warn('[CC] Failed to load aura catalog JSON, using fallback data.js:', err);
        if (!cancelled) {
          setAuraCatalog(AURA_LIGHTS_FALLBACK.map(normalizeAuraEntry).filter(Boolean));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const auraCatalogById = useMemo(() => {
    const map = new Map();
    auraCatalog.forEach(entry => map.set(String(entry.id), entry));
    return map;
  }, [auraCatalog]);

  // Aura icon image preload
  const auraIconRef = useRef(null);
  useEffect(() => {
    const id = state.auraLightsId;
    if (!id || id === 'none') { auraIconRef.current = null; return; }
    const entry = auraCatalogById.get(String(id));
    if (!entry) { auraIconRef.current = null; return; }
    const img = new Image();
    img.onload = () => { auraIconRef.current = img; };
    img.onerror = () => { auraIconRef.current = null; };
    img.src = entry.imageUrl;
  }, [auraCatalogById, state.auraLightsId]);

  const loadXpsCatalog = useCallback(async () => {
    if (xpsDataRef.current) return xpsDataRef.current;
    const response = await fetch(ccAsset('assets/xps_catalog.json'));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    xpsDataRef.current = data;
    setXpsReady(true);
    return data;
  }, []);

  // Resolve aura payloads in priority order: ANM -> XPS -> fallback.
  useEffect(() => {
    const id = state.auraLightsId;
    const entry = id && id !== 'none' ? auraCatalogById.get(String(id)) : null;
    const canvas = canvasRef.current;
    const loadVersion = ++auraLoadVersionRef.current;

    auraEngineRef.current = null;
    auraEngineReadyRef.current = false;
    xpsRendererRef.current = null;

    if (!entry || !canvas) return;

    let cancelled = false;
    const setIfCurrent = (setter) => {
      if (cancelled || auraLoadVersionRef.current !== loadVersion) return false;
      setter();
      return true;
    };

    const resolveAura = async () => {
      if (entry.anmPath && window.AnmEngine) {
        try {
          const eng = new window.AnmEngine(canvas);
          await eng.load([
            { id: 'aura_effect', anmPath: entry.anmPath, atlasPath: entry.atlasPath, role: 'base' },
          ]);
          if (setIfCurrent(() => {
            auraEngineRef.current = eng;
            auraEngineReadyRef.current = true;
          })) {
            return;
          }
        } catch (err) {
          console.warn('[CC] aura ANM load failed, trying XPS fallback:', err);
        }
      }

      const particleId = entry.particleId != null ? String(entry.particleId) : null;
      if (!particleId || !window.XpsParticleSystem) return;

      try {
        const catalog = await loadXpsCatalog();
        const xpsData = catalog?.[particleId];
        if (!xpsData) return;
        const candidates = buildXpsTextureCandidates(particleId, xpsData);
        const loaded = await loadFirstImage(candidates);
        setIfCurrent(() => {
          xpsRendererRef.current = new window.XpsParticleSystem(xpsData, loaded.img);

        });
      } catch (err) {
        console.warn(`[CC] XPS texture load failed for aura ${entry.id}:`, err);
      }
    };

    resolveAura();

    return () => {
      cancelled = true;
      if (auraLoadVersionRef.current === loadVersion) {
        auraEngineRef.current = null;
        auraEngineReadyRef.current = false;
        xpsRendererRef.current = null;
      }
    };
  }, [auraCatalogById, state.auraLightsId, xpsReady, loadXpsCatalog]);


  const activeClass = CLASSES.find(c => c.id === state.classId) || CLASSES[0];
  const copy = copyFor(language);
  const activeClassName = localizedText(activeClass?.name, language, activeClass?.id || '');
  const activeClassRole = localizedText(activeClass?.role, language, '');
  const activeClassDesc = localizedText(activeClass?.desc, language, '');

  // Wake up ANM engine on mount, feed it the Huppermage female manifest.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.AnmEngine) return;

    const resize = () => {
      const dpr = Math.min(RENDER_DPR_CAP, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.round(rect.width * dpr));
      const h = Math.max(420, Math.round(rect.height * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(canvas);

    const engine = new window.AnmEngine(canvas);
    engineRef.current = engine;

    engine.load(buildManifest(activeClass, state)).then(() => {
      syncColors();
      startTsRef.current = null;
      // Throttle to ~30fps. The animations are sprite-based at 24-30fps anyway,
      // so rendering at 60fps duplicates frames and doubles GPU/CPU load.
      const FRAME_INTERVAL_MS = 1000 / 30;
      let lastFrameTs = 0;
      const loop = (ts) => {
        try {
        // Auto-pause when document hidden â€” browsers usually halt rAF while
        // the tab is in the background, but explicit short-circuit keeps
        // the state stable across edge cases (e.g. occluded windows).
        if (document.hidden) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        if (ts - lastFrameTs < FRAME_INTERVAL_MS) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastFrameTs = ts;

        if (startTsRef.current === null) startTsRef.current = ts;
        const timeMs = ts - startTsRef.current;
        const dt = FRAME_INTERVAL_MS / 1000; // Delta time in seconds for XPS

        const ctx = canvas.getContext('2d');
        if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const dir = ROT_TO_DIR(rotationRef.current);
        const animKey = resolveAnimKey(stateRef.current, ANIMATIONS);
        const animName = `${dir}_${animKey}`;
        const animEntry = ANIMATIONS.find(a => a.id === stateRef.current.animation) || ANIMATIONS[0];
        const animLoop = animEntry.loop !== false;
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.90;

        // â”€â”€ Update XPS particle system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (xpsRendererRef.current) {
          xpsRendererRef.current.update(dt);
        }

        // â”€â”€ Aura pre-render (drawn BEFORE character) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const auraState = stateRef.current.auraLightsId;
        if (auraState && auraState !== 'none') {
          const auraEntry = auraCatalogRef.current.find(a => String(a.id) === String(auraState));
          if (auraEntry) {
            const hue = ((auraEntry.id * 137 + 43) % 360 + 360) % 360;
            const pulse = 0.75 + 0.25 * Math.sin(timeMs / 900);
            const auraImg = auraIconRef.current;
            const hasAnm = auraEngineReadyRef.current && auraEngineRef.current;
            const hasXps = xpsRendererRef.current != null;

            if (hasAnm) {
              // ANM aura renders after the character (see post-render block below).
              // Floor glow before character:
              const fRx = canvas.width * 0.26 * pulse;
              const fRy = canvas.height * 0.055 * pulse;
              const floorGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, fRx);
              floorGrd.addColorStop(0, `hsla(${hue},90%,80%,0.35)`);
              floorGrd.addColorStop(0.55, `hsla(${hue},80%,60%,0.14)`);
              floorGrd.addColorStop(1, `hsla(${hue},80%,50%,0)`);
              ctx.save();
              ctx.filter = 'blur(8px)';
              ctx.fillStyle = floorGrd;
              ctx.beginPath();
              ctx.ellipse(cx, cy, fRx, fRy, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            } else if (!hasXps && auraImg && auraImg.complete && auraImg.naturalWidth > 0) {
              // Keep only a subtle floor hint when there is no ANM/XPS payload.
              const fRx = canvas.width * 0.22 * pulse;
              const fRy = canvas.height * 0.045 * pulse;
              const floorGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, fRx);
              floorGrd.addColorStop(0, `hsla(${hue},90%,80%,0.24)`);
              floorGrd.addColorStop(1, `hsla(${hue},80%,50%,0)`);
              ctx.save();
              ctx.filter = 'blur(6px)';
              ctx.fillStyle = floorGrd;
              ctx.beginPath();
              ctx.ellipse(cx, cy, fRx, fRy, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }

        if (xpsRendererRef.current) {
          const bodyHeight = canvas.height * 0.5;
          xpsRendererRef.current.render(ctx, cx, cy, bodyHeight, 'behind');
        }
        engine.render(animName, timeMs, CHARACTER_RENDER_SCALE, cx, cy, { loop: animLoop });

        // â”€â”€ XPS particle render (drawn AFTER character for particles that should overlay) â”€
        if (xpsRendererRef.current) {
          const bodyHeight = canvas.height * 0.5; // Approximate body height
          xpsRendererRef.current.render(ctx, cx, cy, bodyHeight, 'front');
        }

        // â”€â”€ Aura post-render: ANM overlay + icon badge (drawn AFTER character) â”€
        if (auraState && auraState !== 'none') {
          const auraEntry = auraCatalogRef.current.find(a => String(a.id) === String(auraState));
          if (auraEntry) {
            const hasAnm = auraEngineReadyRef.current && auraEngineRef.current;

            // For ANM auras, render the effect on top of the character too
            // (many particle effects are meant to surround the character)
            if (hasAnm) {
              auraEngineRef.current.render('1_AnimStatique_1', timeMs, 2.2, cx, cy, { loop: true });
            }

            // Icon badge in corner â€” always shown so user sees which aura is active
            const auraImg = auraIconRef.current;
            if (auraImg && auraImg.complete && auraImg.naturalWidth > 0) {
              const hue = ((auraEntry.id * 137 + 43) % 360 + 360) % 360;
              const pulse = 0.85 + 0.15 * Math.sin(timeMs / 900);
              const bSize = Math.round(canvas.height * 0.09);
              const bX = Math.round(cx + canvas.width * 0.28 - bSize);
              const bY = Math.round(cy - canvas.height * 0.68);
              ctx.save();
              ctx.shadowColor = `hsla(${hue},95%,75%,${0.9 * pulse})`;
              ctx.shadowBlur = 16;
              ctx.globalAlpha = pulse;
              ctx.drawImage(auraImg, bX, bY, bSize, bSize);
              ctx.restore();
            }
          }
        }

        rafRef.current = requestAnimationFrame(loop);
        } catch (err) {
          console.error('[CC] render loop error:', err);
          rafRef.current = requestAnimationFrame(loop);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    }).catch(err => {
      console.error('[CC] AnmEngine load failed:', err);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  // Reset animation clock when the selected animation changes so it plays from frame 0.
  useEffect(() => { startTsRef.current = null; }, [state.animation]);

  // Reload engine layers when the outfit or hairstyle changes.
  // Skip on first render (engine.load already used the initial values).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const engine = engineRef.current;
    if (!engine) return;
    engine.reload(buildManifest(activeClass, state))
      .then(() => syncColors())
      .catch(err => console.error('[CC] reload failed:', err));
  }, [activeClass, state.outfitId, state.hairStyleId, state.sharedCostumeId, state.hideHelmet, state.relicOverlayId, state.gender, state.classId, state.equipment, state.animation]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncColors = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const SLOT = window.ANM_COLOR_SLOT;
    const hasCostume = activeClass.supportsAdvancedCustomization && state.sharedCostumeId && state.sharedCostumeId !== 'none';

    // â”€â”€ Character base slots (1, 2, 3, 4, 5, 8) â€” always applied â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    engine.setColor(SLOT.SKIN, state.skinColor);
    engine.setColor(SLOT.HAIR, state.hairColor);
    engine.setColor(SLOT.PUPIL, state.eyeColor);
    engine.setColor(SLOT.SYMBOL_FG, state.symbolFg);
    engine.setColor(SLOT.SYMBOL_BG, state.symbolBg);
    engine.setColor(SLOT.SYMBOL_BORDER, state.symbolBg);

    // â”€â”€ Slot 9 (CLOTHES) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Controls the primary fabric tint (slot 9 = CLOTHES).
    //
    // When NO costume is active: the base outfit (211910100) uses slot 9 for
    // its fabric sprites â†’ set to user's costume1 color.
    //
    // When ANY costume is active:
    //   â€¢ Non-CC costumes: slot 9 sprites in the costume should render with
    //     their baked atlas color (the artist's intended color). Setting slot 9
    //     to a player color incorrectly tints these fixed-color costumes.
    //   â€¢ CC costumes: slot 9 sprites are PARENT nodes whose ColorCostume1-6
    //     CHILDREN carry the actual color zones. Tinting the parent with slot 9
    //     would double-tint them since the children already apply their own slot.
    //     The game leaves slot 9 at neutral (no tint) for CC costumes.
    //
    // So: clear slot 9 whenever a costume is active. The outfit's slot-9 sprites
    // are fully overridden by the costume anyway, so nothing is lost.
    if (!hasCostume) {
      engine.setColor(SLOT.CLOTHES, state.costume1);
    } else {
      engine.setColor(SLOT.CLOTHES, null); // baked atlas color â€” no player tint
    }

    // â”€â”€ Equipment overlay slots (10-15 = ColorCostume1-6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Only CC-enabled costumes (and the base outfit) use these slots.
    // For non-CC costumes these setColor calls are no-ops (the sprite definitions
    // have no colorIndex 10-15 so the colors are never applied).
    engine.setColor(10, state.costume1);
    engine.setColor(11, state.costume2);
    engine.setColor(12, state.costume3);
    engine.setColor(13, state.costume4);
    engine.setColor(14, state.costume5);
    engine.setColor(15, state.costume6);
  }, [
    state.skinColor, state.hairColor, state.eyeColor,
    state.costume1, state.costume2, state.costume3,
    state.costume4, state.costume5, state.costume6,
    state.symbolFg, state.symbolBg,
    state.sharedCostumeId,   // re-sync when costume changes
  ]);

  useEffect(() => { syncColors(); }, [syncColors]);

  const classSupportsAdvancedCustomization = !!activeClass?.supportsAdvancedCustomization;

  const filteredClasses = useMemo(() => {
    const q = classQuery.trim().toLowerCase();
    if (!q) return CLASSES;
    return CLASSES.filter(c => {
      const className = localizedText(c.name, language, c.id).toLowerCase();
      const classRole = localizedText(c.role, language, '').toLowerCase();
      return className.includes(q) || classRole.includes(q);
    });
  }, [classQuery, language]);

  const rotateBy = (delta) => setRotation(r => r + delta);
  const resetRotation = () => setRotation(0);
  const toggleSection = useCallback((sectionId) => {
    setOpenSection(current => current === sectionId ? current : sectionId);
  }, []);
  const closeBeta = useCallback(() => {
    try { localStorage.setItem('cc_beta_seen', '1'); } catch {}
    setBetaModalOpen(false);
  }, []);
  const availableHairStyles = useMemo(() => {
    const outfit = OUTFITS.find(o => o.id === state.outfitId && o.classId === activeClass.id);
    const hairClassId = outfit?.hairFamilyOverride || activeClass.id;
    return HAIRSTYLES.filter(h => h.classId === hairClassId);
  }, [activeClass.id, state.outfitId]);
  const availableOutfits = useMemo(
    () => OUTFITS.filter(o => o.classId === activeClass.id && (outfitForGender(o, state.gender) || o.baseOverride?.[state.gender])),
    [activeClass.id, state.gender]
  );
  const activeHair = availableHairStyles.find(h => h.id === state.hairStyleId) || availableHairStyles[0] || null;
  const activeOutfit = availableOutfits.find(o => o.id === state.outfitId) || availableOutfits[0] || null;
  const activeOutfitAppearanceId = outfitForGender(activeOutfit, state.gender);
  const activePaletteKey = activeOutfit
    ? makeOutfitPaletteKey(activeClass.id, state.gender, activeOutfit.id)
    : null;
  const activePalette = activePaletteKey ? outfitPalettes[activePaletteKey] : null;
  const activePngCharacter = pngDefaultPalettes?.characters?.[`${activeClass.id}/${state.gender}`] || null;
  const activePngOutfit = activePaletteKey ? pngDefaultPalettes?.palettes?.[activePaletteKey] : null;
  const activePaletteJson = activePaletteKey ? JSON.stringify({
    version: 1,
    palettes: {
      [activePaletteKey]: activePalette || {
        classId: activeClass.id,
        className: activeClassName,
        gender: state.gender,
        outfitId: activeOutfit?.id,
        outfitLabel: activeOutfit ? repairMojibake(activeOutfit.label) : undefined,
        appearanceId: activeOutfitAppearanceId,
        colors: pickOutfitColors(state),
      },
    },
  }, null, 2) : '';

  const persistOutfitPalettes = useCallback((nextPalettes) => {
    writeStoredOutfitPalettes(nextPalettes);
    setOutfitPalettes(nextPalettes);
  }, []);

  const saveActiveOutfitPalette = useCallback(() => {
    if (!activePaletteKey || !activeOutfit) return;
    const entry = {
      classId: activeClass.id,
      className: activeClassName,
      gender: state.gender,
      outfitId: activeOutfit.id,
      outfitLabel: repairMojibake(activeOutfit.label),
      appearanceId: activeOutfitAppearanceId,
      colors: pickOutfitColors(state),
      updatedAt: new Date().toISOString(),
    };
    persistOutfitPalettes({ ...outfitPalettes, [activePaletteKey]: entry });
    setPaletteStatus(`Guardado ${activeClassName} ${genderLabel(state.gender, language)} / ${repairMojibake(activeOutfit.label)}`);
  }, [
    activeClass.id, activeClassName, activeOutfit, activeOutfitAppearanceId,
    activePaletteKey, outfitPalettes, persistOutfitPalettes, state,
  ]);

  const applyActiveOutfitPalette = useCallback(() => {
    if (!activePalette?.colors) return;
    set(activePalette.colors);
    setPaletteStatus(`Aplicado ${activePalette.className || activeClassName} / ${repairMojibake(activePalette.outfitLabel || activeOutfit?.label || 'armadura')}`);
  }, [activeClassName, activeOutfit, activePalette, set]);

  const applyPngDefaults = useCallback(() => {
    const patch = {};
    if (activePngCharacter?.colors) Object.assign(patch, activePngCharacter.colors);
    if (activePngOutfit?.colors) Object.assign(patch, activePngOutfit.colors);
    if (!Object.keys(patch).length) {
      setPaletteStatus('No hay default PNG para esta seleccion');
      return;
    }
    set(patch);
    const parts = [
      activePngCharacter ? 'cuerpo' : null,
      activePngOutfit ? 'armadura' : null,
    ].filter(Boolean).join(' + ');
    setPaletteStatus(`Default PNG aplicado: ${parts}`);
  }, [activePngCharacter, activePngOutfit, set]);

  useEffect(() => {
    if (!pngDefaultPalettes) return;
    const characterDefaults = pngDefaultPalettes.characters?.[`${activeClass.id}/${state.gender}`]?.colors || null;
    const outfitDefaults = activePaletteKey
      ? pngDefaultPalettes.palettes?.[activePaletteKey]?.colors || null
      : null;
    const patch = {};
    if (characterDefaults) Object.assign(patch, characterDefaults);
    if (outfitDefaults) Object.assign(patch, outfitDefaults);
    if (!Object.keys(patch).length) return;

    setState(current => {
      const changed = Object.entries(patch).some(([key, value]) => current[key] !== value);
      return changed ? { ...current, ...patch } : current;
    });
  }, [activeClass.id, activePaletteKey, pngDefaultPalettes, state.gender]);

  const exportOutfitPalettes = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      palettes: outfitPalettes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wakxy-outfit-palettes.json';
    link.click();
    URL.revokeObjectURL(url);
    setPaletteStatus('JSON exportado');
  }, [outfitPalettes]);

  const importOutfitPalettes = useCallback(() => {
    try {
      const parsed = JSON.parse(paletteImportText);
      const incoming = Array.isArray(parsed)
        ? Object.fromEntries(parsed.map(item => [makeOutfitPaletteKey(item.classId, item.gender, item.outfitId), item]))
        : parsed.palettes || parsed;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        throw new Error('Formato invalido');
      }
      const normalized = {};
      for (const [key, entry] of Object.entries(incoming)) {
        if (!entry || typeof entry !== 'object' || !entry.colors) continue;
        const paletteKey = entry.classId && entry.gender && entry.outfitId
          ? makeOutfitPaletteKey(entry.classId, entry.gender, entry.outfitId)
          : key;
        normalized[paletteKey] = {
          ...entry,
          colors: OUTFIT_COLOR_KEYS.reduce((acc, colorKey) => {
            if (/^#[0-9a-fA-F]{6}$/.test(entry.colors[colorKey] || '')) {
              acc[colorKey] = entry.colors[colorKey];
            }
            return acc;
          }, {}),
          importedAt: new Date().toISOString(),
        };
      }
      if (!Object.keys(normalized).length) throw new Error('No hay paletas validas');
      persistOutfitPalettes({ ...outfitPalettes, ...normalized });
      setPaletteImportText('');
      setPaletteStatus(`Importadas ${Object.keys(normalized).length} paletas`);
    } catch (err) {
      setPaletteStatus(`JSON invalido: ${err.message}`);
    }
  }, [outfitPalettes, paletteImportText, persistOutfitPalettes]);

  // 'unisex' shows for any gender; 'male'/'female' only for matching gender.
  const selectableSharedCostumes = classSupportsAdvancedCustomization ? SHARED_FEMALE_COSTUMES.filter(item =>
    item.gender === 'unisex' || item.gender === state.gender
  ) : [];
  const activeSharedCostume = selectableSharedCostumes.find(item => item.id === state.sharedCostumeId) || null;

  // Which costume color canals (1â€“6) the active costume actually exposes.
  //
  // The game has two independent color systems:
  //   â€¢ Slot 9 (CLOTHES): all 849 costumes use it, but it follows the CHARACTER's
  //     primary outfit color â€” not a per-costume picker. In-game the player never
  //     sets this separately for a costume.
  //   â€¢ Slots 10â€“15 (ColorCostume1â€“6): only 38 appearances (19 pair_keys) define
  //     these. They open a dedicated color picker in the game's dressing room.
  //     These are the ONLY truly "recolorable" costumes.
  //
  // Canal mapping (for the 6 picker rows):
  //   slot 10 â†’ canal 1  (CC1)
  //   slot 11 â†’ canal 2  (CC2)
  //   slot 12 â†’ canal 3  (CC3)
  //   slot 13 â†’ canal 4  (CC4)
  //   slot 14 â†’ canal 5  (CC5)
  //   slot 15 â†’ canal 6  (CC6)
  //
  // When no costume is active: all 6 canals belong to the base outfit (slots 9â€“15).
  const costumeActiveCanals = useMemo(() => {
    if (!activeSharedCostume) return new Set([1, 2, 3, 4, 5, 6]); // base outfit uses all
    const ccSlots = new Set();
    for (const comp of activeSharedCostume.components) {
      for (const s of (comp.colorSlots || [])) {
        if (s >= 10) ccSlots.add(s); // only ColorCostume slots count
      }
    }
    // No CC slots â†’ costume is fixed-color (atlas baked), no recoloring
    if (ccSlots.size === 0) return new Set();
    const canals = new Set();
    if (ccSlots.has(10)) canals.add(1);
    if (ccSlots.has(11)) canals.add(2);
    if (ccSlots.has(12)) canals.add(3);
    if (ccSlots.has(13)) canals.add(4);
    if (ccSlots.has(14)) canals.add(5);
    if (ccSlots.has(15)) canals.add(6);
    return canals;
  }, [activeSharedCostume]);

  // Filtered costume list: always restricted to current character gender + unisex
  const filteredCostumes = useMemo(() => {
    const q = costumeSearch.trim().toLowerCase();
    if (!classSupportsAdvancedCustomization) return [];
    return SHARED_FEMALE_COSTUMES.filter(c => {
      if (c.gender !== 'unisex' && c.gender !== state.gender) return false;
      if (q) return localizedText(c.label, language).toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      return true;
    });
  }, [classSupportsAdvancedCustomization, costumeSearch, state.gender]);

  const downloadCharacterPng = useCallback(async () => {
    const source = canvasRef.current;
    if (!source) {
      setSaveStatus(copy.noCharacterExport);
      return;
    }

    setSaveStatus(copy.preparingPng);

    const width = 1400;
    const height = 1100;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      setSaveStatus(copy.pngCreateError);
      return;
    }

    const currentState = stateRef.current;
    const currentRotation = rotationRef.current;
    const activeAura = currentState.auraLightsId && currentState.auraLightsId !== 'none'
      ? auraCatalogById.get(String(currentState.auraLightsId))
      : null;
    const equippedItems = SLOT_ORDER
      .map(slot => {
        const item = currentState.equipment?.[slot];
        if (!item) return null;
        const slotName = localizedText(SLOT_LABELS[slot], language, slot);
        const itemName = localizedText(item.title, language, item.label || String(item.id));
        return { slot, slotName, itemName, item };
      })
      .filter(Boolean);

    const summaryRows = [
      [copy.classEyebrow, activeClassName],
      [copy.gender, genderLabel(currentState.gender, language)],
      [copy.animation, animLabel(ANIMATIONS.find(a => a.id === currentState.animation) || { id: currentState.animation, label: currentState.animation }, language)],
      ['Rotacion', `${Math.round(((currentRotation % 360) + 360) % 360)}°`],
    ];
    const appearanceRows = [
      [copy.hair, activeHair ? repairMojibake(activeHair.label) : copy.classBase],
      [copy.armor, activeOutfit ? repairMojibake(activeOutfit.label) : copy.classBase],
      [copy.costume, activeSharedCostume ? localizedText(activeSharedCostume.label, language) : copy.noCostume],
      [copy.noHelmet, currentState.hideHelmet ? copy.noHelmet : copy.withHelmet],
      [copy.auras, activeAura ? repairMojibake(activeAura.name) : copy.noAura],
    ];

    const loadExportImage = (src) => new Promise(resolve => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const equipmentImages = await Promise.all(equippedItems.map(entry => (
      loadExportImage(entry.item.iconPath ? apiAsset(entry.item.iconPath) : null)
    )));
    const auraImage = await loadExportImage(activeAura?.imageUrl || null);

    const getCanvasContentBounds = () => {
      try {
        const sctx = source.getContext('2d');
        const { width: sw, height: sh } = source;
        const data = sctx.getImageData(0, 0, sw, sh).data;
        let minX = sw, minY = sh, maxX = 0, maxY = 0;
        for (let y = 0; y < sh; y += 1) {
          for (let x = 0; x < sw; x += 1) {
            const alpha = data[(y * sw + x) * 4 + 3];
            if (alpha > 8) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (minX > maxX || minY > maxY) return { x: 0, y: 0, w: sw, h: sh };
        const pad = 34;
        return {
          x: Math.max(0, minX - pad),
          y: Math.max(0, minY - pad),
          w: Math.min(sw, maxX - minX + pad * 2),
          h: Math.min(sh, maxY - minY + pad * 2),
        };
      } catch (err) {
        return { x: 0, y: 0, w: source.width, h: source.height };
      }
    };

    const drawRoundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const fitLine = (text, maxWidth) => {
      let value = String(text);
      if (ctx.measureText(value).width <= maxWidth) return value;
      while (value.length > 1 && ctx.measureText(`${value}...`).width > maxWidth) {
        value = value.slice(0, -1);
      }
      return `${value.trim()}...`;
    };

    const wrapText = (text, x, y, maxWidth, lineHeight, maxLines = 3) => {
      const words = String(text).split(/\s+/);
      let line = '';
      const lines = [];
      words.forEach(word => {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      });
      if (line) lines.push(line);
      const visibleLines = lines.slice(0, maxLines);
      if (lines.length > maxLines && visibleLines.length) {
        visibleLines[visibleLines.length - 1] = fitLine(visibleLines[visibleLines.length - 1], maxWidth);
      }
      visibleLines.forEach((visibleLine, index) => {
        ctx.fillText(fitLine(visibleLine, maxWidth), x, y + index * lineHeight);
      });
      return y + visibleLines.length * lineHeight;
    };

    const drawPanel = (x, y, w, h, r = 26) => {
      drawRoundRect(x, y, w, h, r);
      ctx.fillStyle = 'rgba(18, 13, 10, 0.78)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,165,116,0.36)';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const drawSectionTitle = (text, x, y) => {
      ctx.fillStyle = '#d4a574';
      ctx.font = '800 20px Segoe UI, sans-serif';
      ctx.fillText(text.toUpperCase(), x, y);
    };

    const drawRows = (rows, x, y, labelWidth, valueWidth, options = {}) => {
      const labelFont = options.labelFont || '800 15px Segoe UI, sans-serif';
      const valueFont = options.valueFont || '700 21px Segoe UI, sans-serif';
      const lineHeight = options.lineHeight || 25;
      const rowGap = options.rowGap || 8;
      const minStep = options.minStep || 32;
      const maxLines = options.maxLines || 2;
      let cursorY = y;
      rows.forEach(([label, value]) => {
        ctx.fillStyle = '#a89a8a';
        ctx.font = labelFont;
        ctx.fillText(label.toUpperCase(), x, cursorY);
        ctx.fillStyle = '#f6efe3';
        ctx.font = valueFont;
        const nextY = wrapText(value, x + labelWidth, cursorY, valueWidth, lineHeight, maxLines);
        cursorY = Math.max(cursorY + minStep, nextY + rowGap);
      });
      return cursorY;
    };

    const drawEmptyIcon = (x, y, size, icon) => {
      drawRoundRect(x, y, size, size, 14);
      ctx.fillStyle = 'rgba(212,165,116,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,165,116,0.32)';
      ctx.stroke();
      ctx.fillStyle = '#d4a574';
      ctx.font = '700 28px Segoe UI Symbol, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon || '-', x + size / 2, y + size / 2 + 10);
      ctx.textAlign = 'left';
    };

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#261b12');
    bg.addColorStop(0.55, '#17100c');
    bg.addColorStop(1, '#0f0b08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, 360, 40, width / 2, 360, 520);
    glow.addColorStop(0, 'rgba(212,165,116,0.28)');
    glow.addColorStop(1, 'rgba(212,165,116,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    drawPanel(52, 48, 1296, 130, 28);
    ctx.fillStyle = '#f5e5ca';
    ctx.font = '700 52px Georgia, serif';
    ctx.fillText(currentState.name || copy.noNameHero, 82, 118);
    ctx.fillStyle = '#d4a574';
    ctx.font = '800 23px Segoe UI, sans-serif';
    ctx.fillText(`${activeClassName} · ${genderLabel(currentState.gender, language)} · ${activeClassRole}`, 84, 154);

    drawPanel(52, 204, 500, 820, 30);
    drawSectionTitle(copy.avatarEyebrow, 90, 260);
    const crop = getCanvasContentBounds();
    const ratio = Math.min(370 / crop.w, 500 / crop.h);
    const drawW = crop.w * ratio;
    const drawH = crop.h * ratio;
    const drawX = 52 + (500 - drawW) / 2;
    const drawY = 300 + (500 - drawH) / 2;
    ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, drawX, drawY, drawW, drawH);
    ctx.fillStyle = 'rgba(212,165,116,0.14)';
    ctx.beginPath();
    ctx.ellipse(302, 850, 160, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    const chipData = [
      activeSharedCostume ? copy.costume : copy.noCostume,
      activeAura ? copy.auras : copy.noAura,
      `${equippedItems.length}/7 ${copy.visual.toLowerCase()}`,
    ];
    let chipX = 88;
    chipData.forEach(chip => {
      const chipW = Math.max(118, ctx.measureText(chip).width + 32);
      drawRoundRect(chipX, 936, chipW, 36, 18);
      ctx.fillStyle = 'rgba(212,165,116,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,165,116,0.28)';
      ctx.stroke();
      ctx.fillStyle = '#f6efe3';
      ctx.font = '800 15px Segoe UI, sans-serif';
      ctx.fillText(chip, chipX + 16, 960);
      chipX += chipW + 10;
    });

    drawPanel(582, 204, 766, 250, 26);
    drawSectionTitle(copy.identity, 620, 258);
    drawRows(summaryRows, 620, 305, 150, 540, { maxLines: 1 });

    drawPanel(582, 478, 766, 250, 26);
    drawSectionTitle(copy.appearance, 620, 532);
    drawRows(appearanceRows, 620, 578, 170, 510, { maxLines: 1, minStep: 31, rowGap: 6 });
    if (auraImage) {
      ctx.drawImage(auraImage, 1238, 510, 56, 56);
    }

    drawPanel(582, 752, 766, 310, 26);
    drawSectionTitle(copy.visualEquipment, 620, 806);
    if (!equippedItems.length) {
      ctx.fillStyle = '#a89a8a';
      ctx.font = '700 22px Segoe UI, sans-serif';
      ctx.fillText(copy.noResults, 620, 862);
    } else {
      equippedItems.forEach((entry, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const cardX = 620 + col * 238;
        const cardY = 836 + row * 64;
        const cardW = 218;
        const cardH = 58;
        drawRoundRect(cardX, cardY, cardW, cardH, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(212,165,116,0.22)';
        ctx.stroke();
        const img = equipmentImages[index];
        if (img) {
          drawRoundRect(cardX + 8, cardY + 8, 36, 36, 10);
          ctx.fillStyle = 'rgba(212,165,116,0.10)';
          ctx.fill();
          ctx.drawImage(img, cardX + 11, cardY + 11, 30, 30);
        } else {
          drawEmptyIcon(cardX + 8, cardY + 8, 36, SLOT_ICONS[entry.slot] || '-');
        }
        ctx.fillStyle = '#d4a574';
        ctx.font = '800 11px Segoe UI, sans-serif';
        ctx.fillText(entry.slotName.toUpperCase(), cardX + 52, cardY + 21);
        ctx.fillStyle = '#f6efe3';
        ctx.font = '700 14px Segoe UI, sans-serif';
        const level = entry.item.level != null ? ` Nv.${entry.item.level}` : '';
        wrapText(`${entry.itemName}${level}`, cardX + 52, cardY + 40, 152, 15, 2);
      });
    }

    try {
      const link = document.createElement('a');
      const safeName = (currentState.name || activeClassName || 'wakgroup-personaje')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'wakgroup-personaje';
      link.href = exportCanvas.toDataURL('image/png');
      link.download = `${safeName}-apariencia.png`;
      link.click();
      setSaveStatus(copy.pngSaved);
    } catch (err) {
      console.error('[CC] PNG export failed:', err);
      setSaveStatus(copy.pngExportError);
    }
  }, [activeClass, activeClassName, activeClassRole, activeHair, activeOutfit, activeSharedCostume, auraCatalogById, copy, language]);

  useEffect(() => {
    if (!activeClass) return;
    const patch = {};
    if (!classSupportsAdvancedCustomization) {
      if (state.sharedCostumeId !== 'none') patch.sharedCostumeId = 'none';
      if (state.hideHelmet) patch.hideHelmet = false;
    }
    if (availableOutfits.length && !availableOutfits.some(o => o.id === state.outfitId)) {
      patch.outfitId = availableOutfits[0].id;
    }
    if (availableHairStyles.length && !availableHairStyles.some(h => h.id === state.hairStyleId)) {
      patch.hairStyleId = availableHairStyles[0].id;
    }
    if (!availableOutfits.length && state.outfitId !== DEFAULTS.outfitId) {
      patch.outfitId = DEFAULTS.outfitId;
    }
    if (!availableHairStyles.length && state.hairStyleId !== DEFAULTS.hairStyleId) {
      patch.hairStyleId = DEFAULTS.hairStyleId;
    }
    if (Object.keys(patch).length) {
      set(patch);
    }
  }, [
    activeClass,
    availableHairStyles,
    availableOutfits,
    classSupportsAdvancedCustomization,
    set,
    state.hairStyleId,
    state.hideHelmet,
    state.outfitId,
    state.sharedCostumeId,
  ]);

  const randomize = () => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const randHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    const nextHairStyles = HAIRSTYLES.filter(h => h.classId === activeClass.id);
    const nextOutfits = OUTFITS.filter(o => o.classId === activeClass.id && outfitForGender(o, state.gender));
    const nextSharedCostumes = activeClass.supportsAdvancedCustomization
      ? SHARED_FEMALE_COSTUMES.filter(item => item.gender === 'unisex' || item.gender === state.gender)
      : [];
    setState(s => ({
      ...s,
      outfitId: pick(nextOutfits.length ? nextOutfits : OUTFITS).id,
      sharedCostumeId: nextSharedCostumes.length && Math.random() > 0.35 ? pick(nextSharedCostumes).id : 'none',
      relicOverlayId: 'none',
      hairStyleId: pick(nextHairStyles.length ? nextHairStyles : HAIRSTYLES).id,
      skinColor: randHex(),
      hairColor: randHex(),
      eyeColor: randHex(),
      costume1: randHex(), costume2: randHex(), costume3: randHex(),
      costume4: randHex(), costume5: randHex(), costume6: randHex(),
      symbolFg: randHex(), symbolBg: randHex(),
    }));
  };

  const rotNorm = ((rotation % 360) + 360) % 360;

  return (
    <div className="cc-page" data-screen-label="01 Creador de personaje">
      {/* 3-column main layout */}
      <div className="cc-layout">
        {/* LEFT - Class */}
        <div className="cc-panel">
          <div className="cc-panel-head">
            <div className="cc-panel-eyebrow">
              <span className="cc-panel-eyebrow-num">I</span>
              <span className="cc-panel-eyebrow-label">{copy.classEyebrow}</span>
            </div>
            <span className="cc-panel-title">{copy.classTitle}</span>
          </div>
          <div className="cc-panel-body">
            <div className="cc-class-grid">
              {CLASSES.map(c => {
                const className = localizedText(c.name, language, c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={'cc-class-card' + (c.id === state.classId ? ' active' : '')}
                    style={{ '--card-accent': hexAlpha(c.accent, 0.28) }}
                    onClick={() => set({ classId: c.id })}
                    title={className}
                  >
                    <ClassIcon classData={c} gender={state.gender} />
                    <span className="cc-class-name">{className}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* CENTER - Preview */}
        <div className="cc-panel cc-panel-center">
          <div className="cc-panel-head cc-panel-head-center">
            <div className="cc-panel-heading-main">
              <div className="cc-panel-eyebrow">
                <span className="cc-panel-eyebrow-num">II</span>
                <span className="cc-panel-eyebrow-label">{copy.avatarEyebrow}</span>
              </div>
              <span className="cc-panel-title">{state.name || copy.unnamed} · {activeClassName}</span>
            </div>
            <div className="cc-panel-toolbar">
              <button className="btn btn-ghost" onClick={randomize}>
                <Icon name="dice" style={{ display: 'inline-flex', width: 16, height: 16 }} />
                {copy.random}
              </button>
              <button className="btn btn-ghost" onClick={() => setState(DEFAULTS)}>{copy.reset}</button>
              <button className="btn btn-primary" onClick={downloadCharacterPng}>
                <Icon name="save" style={{ display: 'inline-flex', width: 16, height: 16 }} />
                {copy.savePng}
              </button>
            </div>
          </div>
          <div className="cc-stage">
            <div className="cc-stage-main">
              <div className={'cc-stage-viewport cc-bg-' + state.bg}>
                <div className="cc-stage-runes" />
                <div className="cc-stage-ring" />
                <div className="cc-stage-floor" />

                <div className="cc-character-wrap">
                  <canvas
                    ref={canvasRef}
                    id="characterCanvas"
                    className="cc-character-canvas"
                  />
                </div>

                <div className="cc-stage-controls">
                  <button className="btn-icon" onClick={() => rotateBy(45)} title={copy.rotateLeft}>
                    <Icon name="left" style={{ width: 16, height: 16 }} />
                  </button>
                  <button className="btn-icon" onClick={resetRotation} title={copy.resetRotation}>
                    <Icon name="rotate" style={{ width: 15, height: 15 }} />
                  </button>
                  <span className="cc-rotation-display">{Math.round(rotNorm)}°</span>
                  <button className="btn-icon" onClick={() => rotateBy(-45)} title={copy.rotateRight}>
                    <Icon name="right" style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <div className="cc-bg-switcher">
                  {BG_OPTIONS.map(b => (
                    <button
                      key={b.id}
                      className={`cc-bg-swatch cc-bg-swatch-${b.id} ${state.bg === b.id ? 'active' : ''}`}
                      onClick={() => set({ bg: b.id })}
                      title={localizedText(b.label, language, b.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="cc-workbench-grid">
                <div className="cc-workbench-card cc-workbench-card--wide">
                  <span className="cc-workbench-label">{copy.summary}</span>
                  <strong>{state.name || copy.noNameHero}</strong>
                </div>
                <div className="cc-workbench-card">
                  <span className="cc-workbench-label">{copy.hair}</span>
                  <strong>{activeHair ? repairMojibake(activeHair.label) : copy.classBase}</strong>
                </div>
                <div className="cc-workbench-card">
                  <span className="cc-workbench-label">{copy.armor}</span>
                  <strong>{activeOutfit ? repairMojibake(activeOutfit.label) : copy.classBase}</strong>
                </div>
                <div className="cc-workbench-card">
                  <span className="cc-workbench-label">{copy.costume}</span>
                  <strong>{activeSharedCostume ? localizedText(activeSharedCostume.label, language) : copy.noCostume}</strong>
                  <p>{activeSharedCostume ? repairMojibake(activeSharedCostume.sourceLabel) : (activeOutfit ? copy.baseClothes : copy.liveBase)}</p>
                </div>
                <div className="cc-workbench-card cc-workbench-card--palette">
                  <span className="cc-workbench-label">{copy.activePalette}</span>
                  <div className="cc-palette-row">
                    {[state.skinColor, state.hairColor, state.eyeColor, state.costume1, state.costume2, state.costume5].map((color, index) => (
                      <span key={`${color}-${index}`} className="cc-palette-dot" style={{ background: color }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - Customization */}
        <div className="cc-panel">
          <div className="cc-panel-head">
            <div className="cc-panel-eyebrow">
              <span className="cc-panel-eyebrow-num">III</span>
              <span className="cc-panel-eyebrow-label">{copy.appearance}</span>
            </div>
            <span className="cc-panel-title">{copy.customize}</span>
          </div>
          <div className="cc-panel-body">
            <div className="cc-panel-quick-summary">
              <span className="cc-quick-chip">{activeClassName}</span>
              <span className="cc-quick-chip">{genderLabel(state.gender, language)}</span>
              <span className="cc-quick-chip">{activeOutfit ? repairMojibake(activeOutfit.label) : copy.classBase}</span>
              <span className="cc-quick-chip">{activeSharedCostume ? localizedText(activeSharedCostume.label, language) : copy.noCostume}</span>
            </div>

            <div className={'cc-section' + (openSection === 'identity' ? ' is-open' : '')}>
              <button type="button" className="cc-section-head cc-section-toggle" onClick={() => toggleSection('identity')}>
                <span className="cc-section-title"><Icon name="user" /> {copy.identity}</span>
                <span className="cc-section-caret">{openSection === 'identity' ? '−' : '+'}</span>
              </button>
              {openSection === 'identity' && (
                <div className="cc-field-group">
                  <div>
                    <label className="cc-input-label">{copy.heroName}</label>
                    <input
                      className="cc-input"
                      type="text"
                      value={state.name}
                      maxLength={20}
                      onChange={e => set({ name: e.target.value })}
                      placeholder={copy.heroNamePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="cc-input-label">{copy.gender}</label>
                    <div className="cc-segmented">
                      <button
                        className={'cc-seg-btn' + (state.gender === 'female' ? ' active' : '')}
                        onClick={() => { set({ gender: 'female', sharedCostumeId: 'none' }); }}
                      >♀ {copy.female}</button>
                      <button
                        className={'cc-seg-btn' + (state.gender === 'male' ? ' active' : '')}
                        onClick={() => { set({ gender: 'male', sharedCostumeId: 'none' }); }}
                      >♂ {copy.male}</button>
                    </div>
                  </div>
                  <div>
                    <label className="cc-input-label">{copy.animation}</label>
                    {/* Category tabs */}
                    <div className="cc-anim-tabs">
                      {[
                        { cat: 'move',   label: copy.movement },
                        { cat: 'female', label: genderLabel(state.gender, language) },
                        { cat: 'weapon', label: copy.weapons },
                      ].map(({ cat, label }) => (
                        <button
                          key={cat}
                          className={'cc-anim-tab' + (state.animCat === cat ? ' active' : '')}
                          onClick={() => set({ animCat: cat })}
                        >{label}</button>
                      ))}
                    </div>
                    {/* Animation grid for active category */}
                    <div className="cc-anim-grid">
                      {ANIMATIONS.filter(a => a.cat === state.animCat).map(a => (
                        <button
                          key={a.id}
                          className={'cc-anim-btn' + (state.animation === a.id ? ' active' : '')}
                          onClick={() => set({ animation: a.id })}
                          title={a.animKey}
                        >{animLabel(a, language)}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={'cc-section' + (openSection === 'face' ? ' is-open' : '')}>
              <button type="button" className="cc-section-head cc-section-toggle" onClick={() => toggleSection('face')}>
                <span className="cc-section-title"><Icon name="face" /> {copy.face}</span>
                <span className="cc-section-caret">{openSection === 'face' ? '−' : '+'}</span>
              </button>
              {openSection === 'face' && (
                <div className="cc-field-group">
                  <div>
                    <label className="cc-input-label">{copy.skinTone}</label>
                    <HexPicker value={state.skinColor} onChange={v => set({ skinColor: v })} />
                  </div>
                  <div>
                    <label className="cc-input-label">{copy.eyeColor}</label>
                    <HexPicker value={state.eyeColor} onChange={v => set({ eyeColor: v })} />
                  </div>
                </div>
              )}
            </div>

            <div className={'cc-section' + (openSection === 'hair' ? ' is-open' : '')}>
              <button type="button" className="cc-section-head cc-section-toggle" onClick={() => toggleSection('hair')}>
                <span className="cc-section-title"><Icon name="palette" /> {copy.hair}</span>
                <span className="cc-section-caret">{openSection === 'hair' ? '−' : '+'}</span>
              </button>
              {openSection === 'hair' && (
                <div className="cc-field-group">
                  <div>
                    <label className="cc-input-label">{copy.hair}</label>
                    {classSupportsAdvancedCustomization ? (
                      <div className="cc-style-grid cc-style-grid--hair">
                        {availableHairStyles.map(h => (
                          <button
                            key={h.id}
                            type="button"
                            className={'cc-style-card' + (state.hairStyleId === h.id ? ' active' : '')}
                            onClick={() => set({ hairStyleId: h.id })}
                            title={repairMojibake(h.label)}
                          >
                            <span className="cc-style-icon">✦</span>
                            <span className="cc-style-name">{repairMojibake(h.label)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="cc-inline-note">{copy.realBaseNoHair}</div>
                    )}
                  </div>
                  <div>
                    <label className="cc-input-label">{copy.hairColor}</label>
                    <HexPicker value={state.hairColor} onChange={v => set({ hairColor: v })} />
                  </div>
                </div>
              )}
            </div>

            <div className={'cc-section' + (openSection === 'wardrobe' ? ' is-open' : '')}>
              <button type="button" className="cc-section-head cc-section-toggle" onClick={() => toggleSection('wardrobe')}>
                <span className="cc-section-title"><Icon name="cape" /> {copy.wardrobe}</span>
                <span className="cc-section-caret">{openSection === 'wardrobe' ? '−' : '+'}</span>
              </button>
              {openSection === 'wardrobe' && (
                <div className="cc-field-group">
                  <div>
                    <label className="cc-input-label">{copy.armorModel}</label>
                    {availableOutfits.length > 0 ? (
                      <div className="cc-style-grid cc-style-grid--outfits">
                        {availableOutfits.map(o => (
                          <button
                            key={o.id}
                            type="button"
                            className={'cc-style-card' + (state.outfitId === o.id ? ' active' : '')}
                            onClick={() => set({ outfitId: o.id })}
                            title={repairMojibake(o.label)}
                          >
                            <span className="cc-style-icon">⚔</span>
                            <span className="cc-style-name">{repairMojibake(o.label)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="cc-inline-note">{copy.noOutfits}</div>
                    )}
                  </div>
                  <div>
                    <label className="cc-input-label">{copy.costume}</label>
                    <div className="cc-wardrobe-summary">
                      <div className="cc-wardrobe-pill">
                        <span className="cc-wardrobe-pill-label">{copy.costume}</span>
                        <strong>{activeSharedCostume ? localizedText(activeSharedCostume.label, language) : copy.noCostume}</strong>
                      </div>
                      <div className="cc-wardrobe-pill">
                        <span className="cc-wardrobe-pill-label">{copy.available}</span>
                        <strong>{classSupportsAdvancedCustomization ? selectableSharedCostumes.length : 0} {copy.costume.toLowerCase()}</strong>
                      </div>
                      <div className="cc-wardrobe-pill">
                        <span className="cc-wardrobe-pill-label">{copy.status}</span>
                        <strong>{state.hideHelmet && activeSharedCostume ? copy.noHelmet : copy.fullView}</strong>
                      </div>
                    </div>
                    <div className="cc-wardrobe-actions">
                      <button
                        type="button"
                        className="btn btn-ghost cc-wardrobe-open"
                        onClick={() => setWardrobeOpen(true)}
                      >
                        {copy.openWardrobe}
                      </button>
                      {classSupportsAdvancedCustomization && activeSharedCostume && (
                        <button
                          type="button"
                          className={'cc-seg-btn cc-costume-filter-btn' + (state.hideHelmet ? ' active' : '')}
                          onClick={() => set({ hideHelmet: !state.hideHelmet })}
                          title={copy.noHelmet}
                        >{state.hideHelmet ? copy.noHelmet : copy.withHelmet}</button>
                      )}
                      {state.sharedCostumeId !== 'none' && (
                        <button
                          type="button"
                          className="cc-seg-btn"
                          onClick={() => set({ sharedCostumeId: 'none' })}
                        >
                          {copy.removeCostume}
                        </button>
                      )}
                    </div>
                    {!classSupportsAdvancedCustomization && (
                      <div className="cc-inline-note">{copy.noAdvancedWardrobe}</div>
                    )}
                    {activeSharedCostume && (
                      <div className="cc-shared-costume-meta">
                        <strong>{activeSharedCostume.sourceLabel ? repairMojibake(activeSharedCostume.sourceLabel) : localizedText(activeSharedCostume.label, language)}</strong>
                        <span>
                          {activeSharedCostume.components.length} {activeSharedCostume.components.length !== 1 ? copy.components : copy.component}
                          {activeSharedCostume.itemId ? ` · item #${activeSharedCostume.itemId}` : ` · ${activeSharedCostume.components[0]?.appearanceId}`}
                        </span>
                      </div>
                    )}
                  </div>
                  {[
                    { canal: 1, key: 'costume1', label: copy.channel1 },
                    { canal: 2, key: 'costume2', label: copy.channel2 },
                    { canal: 3, key: 'costume3', label: copy.channel3 },
                    { canal: 4, key: 'costume4', label: copy.channel4 },
                    { canal: 5, key: 'costume5', label: copy.channel5 },
                    { canal: 6, key: 'costume6', label: copy.channel6 },
                  ].map(({ canal, key, label }) => {
                    const active = costumeActiveCanals.size === 0
                      ? false                          // costume has no color support â€” all inactive
                      : costumeActiveCanals.has(canal);
                    const inactive = !classSupportsAdvancedCustomization || (activeSharedCostume && !active);
                    return (
                      <div
                        key={key}
                        className={'cc-canal-row' + (inactive ? ' cc-canal-row--inactive' : '')}
                        title={inactive ? copy.noEffectTitle : undefined}
                      >
                        <label className="cc-input-label">
                          {label}
                          {inactive && <span className="cc-canal-badge">{copy.noEffect}</span>}
                        </label>
                        <HexPicker value={state[key]} onChange={v => set({ [key]: v })} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Auras — en desarrollo, oculta en la UI hasta que esté lista */}
            {false && <div className={'cc-section' + (openSection === 'auras' ? ' is-open' : '')}>
              <button type="button" className="cc-section-head cc-section-toggle" onClick={() => toggleSection('auras')}>
                <span className="cc-section-title"><Icon name="sparkles" /> {copy.auras}</span>
                <span className="cc-section-caret">{openSection === 'auras' ? '−' : '+'}</span>
              </button>
              {openSection === 'auras' && auraCatalog.length > 0 && (() => {
                const equip = auraCatalog.filter(a => a.type === 'equipment_aura');
                const AuraCard = ({ aura }) => (
                  <button
                    key={aura.id}
                    type="button"
                    className={'cc-aura-card' + (state.auraLightsId === aura.id ? ' active' : '')}
                    onClick={() => set({ auraLightsId: aura.id })}
                    title={repairMojibake(aura.name)}
                  >
                    <img
                      className="cc-aura-preview"
                      src={aura.imageUrl}
                      alt={repairMojibake(aura.name)}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="cc-aura-label">{repairMojibake(aura.name)}</span>
                  </button>
                );
                return (
                  <div className="cc-field-group">
                    <label className="cc-input-label">
                      {copy.equipmentAuras}
                      <span className="cc-input-label-sub"> · {equip.length}</span>
                    </label>
                    <div className="cc-aura-grid">
                      <button
                        type="button"
                        className={'cc-aura-card' + (state.auraLightsId === 'none' ? ' active' : '')}
                        onClick={() => set({ auraLightsId: 'none' })}
                        title={copy.noAura}
                      >
                        <span className="cc-aura-no-icon">×</span>
                        <span className="cc-aura-label">{copy.noAura}</span>
                      </button>
                      {equip.map(a => <AuraCard key={a.id} aura={a} />)}
                    </div>
                  </div>
                );
              })()}
            </div>}

            <div className="cc-cta-row">
              {saveStatus && <span className="cc-save-status">{saveStatus}</span>}
              <button className="btn btn-primary" onClick={saveToWakGroup}>{copy.saveAppearance}</button>
            </div>
          </div>
        </div>
      </div>

      {wardrobeOpen && (
        <div className="cc-modal-backdrop" onClick={() => setWardrobeOpen(false)}>
          <div
            className="cc-modal cc-modal--wardrobe"
            role="dialog"
            aria-modal="true"
            aria-label={copy.wardrobeModal}
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-head">
              <div>
                <span className="cc-panel-eyebrow-label">{copy.wardrobeModal}</span>
                <h3 className="cc-modal-title">{copy.wardrobeOf} {activeClassName}</h3>
              </div>
              <button
                type="button"
                className="cc-modal-close"
                onClick={() => setWardrobeOpen(false)}
                aria-label={copy.closeWardrobe}
              >
                ×
              </button>
            </div>
            <div className="cc-modal-body">
              {classSupportsAdvancedCustomization && (
                <div className="cc-modal-section">
                  <label className="cc-input-label">
                    {copy.costume}
                    <span className="cc-input-label-sub"> · {SHARED_FEMALE_COSTUMES.length} {copy.catalog} · {selectableSharedCostumes.length} {copy.available.toLowerCase()}</span>
                  </label>
                  <div className="cc-costume-search-row">
                    <input
                      className="cc-costume-search"
                      type="text"
                      placeholder={copy.searchCostume}
                      value={costumeSearch}
                      onChange={e => { setCostumeSearch(e.target.value); }}
                    />
                    {activeSharedCostume && (
                      <button
                        type="button"
                        className={'cc-seg-btn cc-costume-filter-btn' + (state.hideHelmet ? ' active' : '')}
                        onClick={() => set({ hideHelmet: !state.hideHelmet })}
                        title={copy.noHelmet}
                      >{state.hideHelmet ? copy.noHelmet : copy.withHelmet}</button>
                    )}
                  </div>
                  <div className="cc-costume-grid cc-costume-grid--modal">
                    <button
                      type="button"
                      className={'cc-costume-card cc-costume-card--none' + (state.sharedCostumeId === 'none' ? ' active' : '')}
                      onClick={() => set({ sharedCostumeId: 'none' })}
                      title={copy.externalNoCostume}
                    >
                      <span className="cc-costume-no-icon">×</span>
                      <span className="cc-costume-name">{copy.noCostume}</span>
                    </button>
                    {filteredCostumes.map(costume => {
                      const itemIconSrc = costume.iconPath ? apiAsset(costume.iconPath) : null;
                      const src = itemIconSrc || apiAsset('/assets/items/51317870.png');
                      const costumeLabel = localizedText(costume.label, language);
                      return (
                        <button
                          key={costume.id}
                          type="button"
                          className={['cc-costume-card', state.sharedCostumeId === costume.id ? 'active' : ''].filter(Boolean).join(' ')}
                          onClick={() => set({ sharedCostumeId: costume.id })}
                          title={costume.notes ? repairMojibake(costume.notes) : costumeLabel}
                        >
                          <img
                            className="cc-costume-preview"
                            src={src}
                            alt={costumeLabel}
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                            onError={itemIconSrc ? (e => {
                              if (e.target.src !== apiAsset('/assets/items/51317870.png')) e.target.src = apiAsset('/assets/items/51317870.png');
                            }) : undefined}
                          />
                          <span className="cc-costume-name">{costumeLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {betaModalOpen && (
        <div className="cc-modal-backdrop" onClick={closeBeta}>
          <div
            className="cc-modal cc-modal--beta"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-head">
              <div>
                <span className="cc-panel-eyebrow-label cc-beta-eyebrow">BETA</span>
                <h3 className="cc-modal-title">{copy.betaTitle}</h3>
              </div>
            </div>
            <div className="cc-modal-body">
              <p className="cc-beta-intro">{copy.betaIntro}</p>
              <ul className="cc-beta-list">
                <li>{copy.betaItem1}</li>
                <li>{copy.betaItem2}</li>
                <li>{copy.betaItem3}</li>
                <li>{copy.betaItem4}</li>
                <li>{copy.betaItem5}</li>
              </ul>
              <p className="cc-beta-feedback">{copy.betaFeedback}</p>
              <div className="cc-beta-actions">
                <button type="button" className="btn btn-primary" onClick={closeBeta}>
                  {copy.betaStart}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loadout bar */}
      <div className="cc-loadout">
        <div className="cc-loadout-label">
          <small>{copy.equipment}</small>
          <strong>{copy.visual}</strong>
        </div>
        <div className="cc-loadout-slots">
          {SLOT_ORDER.map(slot => {
            const equipped = state.equipment[slot];
            const slotLabel = localizedText(SLOT_LABELS[slot], language, slot);
            const equippedName = equipped ? localizedText(equipped.title, language, equipped.name || `Item ${equipped.id}`) : '';
            return (
              <button
                key={slot}
                data-slot={slot}
                className={'cc-slot' + (equipped ? ' is-filled' : '') + (equipPopoverOpen && equipActiveSlot === slot ? ' is-active' : '')}
                aria-label={slotLabel}
                title={equipped ? `${slotLabel}: ${equippedName}` : slotLabel}
                onClick={() => {
                  setEquipActiveSlot(slot);
                  setEquipPopoverOpen(current => equipActiveSlot === slot ? !current : true);
                }}
              >
                <EquippedSlotIcon item={equipped} slot={slot} />
                <span className="cc-slot-name">{slotLabel.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
        {equipPopoverOpen && (
          <EquipmentPopover
            equipment={state.equipment}
            language={language}
            activeSlot={equipActiveSlot}
            onClose={() => setEquipPopoverOpen(false)}
            onSlotChange={(slot, item) => {
              const nextEquipment = { ...state.equipment };
              if (item) nextEquipment[slot] = item;
              else delete nextEquipment[slot];
              const next = { equipment: nextEquipment };
              if (slot === 'FIRST_WEAPON') next.animation = 'idle';
              set(next);
            }}
          />
        )}
      </div>
    </div>
  );
}

function hexAlpha(hex, a) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<CharacterCreator />);
