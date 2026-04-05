import type { Language } from '@/lib/language-context';

type LocalizedText = Record<Language, string>;

const text = (es: string, en: string, fr: string, pt: string): LocalizedText => ({ es, en, fr, pt });

function pick(texts: LocalizedText, language: Language): string {
    return texts[language] || texts.es;
}

function pickTable<T extends Record<string, LocalizedText>>(table: T, language: Language): { [K in keyof T]: string } {
    return Object.fromEntries(Object.entries(table).map(([key, value]) => [key, pick(value, language)])) as { [K in keyof T]: string };
}

const builderCopy = {
    buildName: text('Nombre del build', 'Build name', 'Nom du build', 'Nome da build'),
    level: text('Nivel', 'Level', 'Niveau', 'Nivel'),
    maxLevel: text('Nivel maximo', 'Max level', 'Niveau max', 'Nivel maximo'),
    class: text('Clase', 'Class', 'Classe', 'Classe'),
    search: text('Buscar', 'Search', 'Rechercher', 'Buscar'),
    searchPlaceholder: text('Nombre, stat o tipo...', 'Name, stat, or type...', 'Nom, stat ou type...', 'Nome, stat ou tipo...'),
    rarity: text('Rareza', 'Rarity', 'Rarete', 'Raridade'),
    rarityAll: text('Todas', 'All', 'Toutes', 'Todas'),
    itemType: text('Tipo de equipamiento', 'Equipment type', 'Type d equipement', 'Tipo de equipamento'),
    itemTypeAll: text('Todos', 'All', 'Tous', 'Todos'),
    statFilter: text('Estadistica', 'Stat', 'Statistique', 'Estatistica'),
    statAll: text('Todas', 'All', 'Toutes', 'Todas'),
    equipment: text('Buscar', 'Gear', 'Equipement', 'Equipamento'),
    characteristics: text('Caracteristicas', 'Characteristics', 'Caracteristiques', 'Caracteristicas'),
    adjustments: text('Ajustes', 'Adjustments', 'Ajustements', 'Ajustes'),
    enchantments: text('Encantamientos', 'Enchantments', 'Enchantements', 'Encantamentos'),
    summary: text('Resumen', 'Summary', 'Resume', 'Resumo'),
    equip: text('Equipar', 'Equip', 'Equiper', 'Equipar'),
    equipped: text('Equipada', 'Equipped', 'Equipe', 'Equipada'),
    loading: text('Cargando piezas...', 'Loading items...', 'Chargement des pieces...', 'Carregando pecas...'),
    noResults: text('No hay piezas con esos filtros.', 'No items match those filters.', 'Aucune piece ne correspond a ces filtres.', 'Nenhuma peca corresponde a esses filtros.'),
    relics: text('Reliquias', 'Relics', 'Reliques', 'Reliquias'),
    epics: text('Epicos', 'Epics', 'Epiques', 'Epicos'),
    souvenirs: text('Recuerdos', 'Souvenirs', 'Souvenirs', 'Souvenirs'),
    noItem: text('Selecciona una pieza equipada para revisar detalles.', 'Select an equipped item to inspect it.', 'Selectionnez une piece equipee pour voir les details.', 'Selecione uma peca equipada para ver os detalhes.'),
    summaryPlaceholder: text('Vista compacta de estadisticas, equipamiento y encantamientos del build.', 'Compact view of stats, gear, and enchantments for this build.', 'Vue compacte des statistiques, de l equipement et des enchantements du build.', 'Visao compacta das estatisticas, do equipamento e dos encantamentos da build.'),
    mainStats: text('Estadisticas principales', 'Main stats', 'Statistiques principales', 'Estatisticas principais'),
    elementalStats: text('Elementos', 'Elements', 'Elements', 'Elementos'),
    secondaryStats: text('Secundarias', 'Secondary stats', 'Statistiques secondaires', 'Estatisticas secundarias'),
    aptitudeSummary: text('Resumen', 'Summary', 'Resume', 'Resumo'),
    basePoints: text('Base nivel 230', 'Level 230 base', 'Base niveau 230', 'Base nivel 230'),
    points: text('pts', 'pts', 'pts', 'pts'),
    importBuild: text('Importar build', 'Import build', 'Importer build', 'Importar build'),
    exportBuild: text('Exportar build', 'Export build', 'Exporter build', 'Exportar build'),
    importError: text('No se pudo importar el archivo del build.', 'Could not import the build file.', 'Impossible d importer le fichier du build.', 'Nao foi possivel importar o arquivo da build.'),
    importSuccess: text('Build importado.', 'Build imported.', 'Build importe.', 'Build importada.'),
    exportSuccess: text('Build exportado.', 'Build exported.', 'Build exporte.', 'Build exportada.'),
    unequip: text('Desequipar', 'Unequip', 'Retirer', 'Desequipar'),
    compare: text('Comparacion', 'Comparison', 'Comparaison', 'Comparacao'),
    compareEmpty: text('Selecciona una pieza del catalogo para compararla con la equipada.', 'Select an item from the catalog to compare it with the equipped one.', 'Selectionnez une piece du catalogue pour la comparer a celle equipee.', 'Selecione uma peca do catalogo para compara-la com a equipada.'),
    compareNoEquipped: text('No hay item equipado en este slot. La comparacion se hace contra vacio.', 'There is no item equipped in this slot. The comparison is against empty.', 'Aucun objet n est equipe dans cet emplacement. La comparaison se fait contre le vide.', 'Nao ha item equipado neste slot. A comparacao e contra o vazio.'),
    compareSame: text('Esta pieza ya esta equipada en el slot activo.', 'This item is already equipped in the active slot.', 'Cette piece est deja equipee dans l emplacement actif.', 'Esta peca ja esta equipada no slot ativo.'),
    compareNoStatChange: text('Sin cambios netos en el build.', 'No net changes in the build.', 'Aucun changement net sur le build.', 'Sem mudancas liquidas na build.'),
    compareVsEquipped: text('vs equipado actual', 'vs current item', 'vs objet actuel', 'vs item atual'),
    compareBuildDelta: text('Diferencia en el build', 'Build delta', 'Difference sur le build', 'Diferenca na build'),
    masteryPrefs: text('Preferencia dominio', 'Mastery priority', 'Priorite maitrise', 'Preferencia de dominio'),
    resistancePrefs: text('Preferencia resis', 'Resistance priority', 'Priorite resistance', 'Preferencia de resistencia'),
    invalidCondition: text('Condicion no cumplida', 'Requirement not met', 'Condition non remplie', 'Condicao nao cumprida'),
    cannotEquip: text('No equipable', 'Cannot equip', 'Non equipable', 'Nao equipavel'),
    twoHandedWeaponEquipped: text('Arma de dos manos equipada - slot secundario bloqueado', 'Two-handed weapon equipped - secondary slot blocked', 'Arme a deux mains equipee - emplacement secondaire bloque', 'Arma de duas maos equipada - slot secundario bloqueado'),
    sameRingType: text('No se permiten anillos del mismo tipo', 'Duplicate ring types are not allowed', 'Les anneaux du meme type ne sont pas autorises', 'Aneis do mesmo tipo nao sao permitidos'),
    noLimit: text('sin limite', 'no limit', 'sans limite', 'sem limite'),
    aptitude: text('Aptitud', 'Aptitude', 'Aptitude', 'Aptidao'),
    maxLevels: text('Max. niveles', 'Max levels', 'Niveaux max', 'Niveis max'),
    currentValue: text('Valor actual', 'Current value', 'Valeur actuelle', 'Valor atual'),
    pointShort: text('pt', 'pt', 'pt', 'pt'),
    pointsShort: text('pts', 'pts', 'pts', 'pts'),
    resourceBreeze: text('Brisa', 'Breeze', 'Brise', 'Brisa'),
    resourceWakfu: text('PW', 'WP', 'PW', 'PW'),
    armor: text('Armadura', 'Armor', 'Armure', 'Armadura'),
    totalMastery: text('Dominio total', 'Total mastery', 'Maitrise totale', 'Dominio total'),
    hpShort: text('PdV', 'HP', 'PV', 'PV'),
    summaryEquippedShort: text('eq.', 'eq.', 'eq.', 'eq.'),
    summaryRelicsShort: text('rel.', 'rel.', 'rel.', 'rel.'),
    summaryEpicsShort: text('epic.', 'epic.', 'epic.', 'epic.'),
    summarySouvenirsShort: text('souv.', 'souv.', 'souv.', 'souv.'),
    summaryEffects: text('efectos', 'effects', 'effets', 'efeitos'),
    summaryNoSublimations: text('Sin sublimaciones', 'No sublimations', 'Aucune sublimation', 'Sem sublimacoes'),
    summaryNoRunes: text('Sin runas', 'No runes', 'Aucune rune', 'Sem runas'),
    levelShort: text('Lv.', 'Lv.', 'Nv.', 'Nv.'),
    resShort: text('RES', 'RES', 'RES', 'RES'),
    masteryShort: text('DOM', 'MAS', 'MAI', 'DOM'),
    guildBonusTitle: text('Bonus de gremio', 'Guild bonus', 'Bonus de guilde', 'Bonus de guilda'),
    guildBonusHelp: text('Activa el preset de bonus del gremio para sumarlo al build.', 'Enable the guild preset bonus and add it to the build.', 'Active le preset de bonus de guilde pour l ajouter au build.', 'Ative o preset de bonus da guilda para soma-lo a build.'),
    guildBonusPreset: text('Preset visible en la imagen del gremio', 'Preset shown in the guild screenshot', 'Preset visible sur la capture de guilde', 'Preset visivel na imagem da guilda'),
    guildBonusEnabled: text('Activo', 'Active', 'Actif', 'Ativo'),
    guildBonusDisabled: text('Inactivo', 'Inactive', 'Inactif', 'Inativo'),
    guildBonusButton: text('Gremio', 'Guild', 'Guilde', 'Guilda'),
    manualStatsTitle: text('Ajustes manuales', 'Manual adjustments', 'Ajustements manuels', 'Ajustes manuais'),
    manualStatsHelp: text('Suma o resta stats manualmente para simular bonus externos o configuraciones especiales. La vida queda fuera de esta herramienta.', 'Add or subtract stats manually to simulate external bonuses or special setups. Health is excluded from this tool.', 'Ajoutez ou retirez des stats manuellement pour simuler des bonus externes ou des configurations speciales. La vie est exclue de cet outil.', 'Some ou subtraia stats manualmente para simular bonus externos ou configuracoes especiais. Vida fica fora desta ferramenta.'),
    manualStatsAdd: text('Agregar stat', 'Add stat', 'Ajouter une stat', 'Adicionar stat'),
    manualStatsAvailable: text('Estadistica disponible', 'Available stat', 'Stat disponible', 'Estatistica disponivel'),
    manualStatsEmpty: text('Aun no hay ajustes manuales activos.', 'There are no active manual adjustments yet.', 'Aucun ajustement manuel actif pour le moment.', 'Ainda nao ha ajustes manuais ativos.'),
    manualStatsReset: text('Resetear', 'Reset', 'Reinitialiser', 'Redefinir'),
    manualStatsRemove: text('Quitar', 'Remove', 'Retirer', 'Remover'),
    manualStatsValue: text('Valor manual', 'Manual value', 'Valeur manuelle', 'Valor manual'),
    manualStatsQuickStep: text('Pasos rapidos', 'Quick steps', 'Pas rapides', 'Passos rapidos'),
    manualStatsEditHint: text('Haz clic en una fila para escribir un valor positivo o negativo.', 'Click a row to type a positive or negative value.', 'Cliquez sur une ligne pour saisir une valeur positive ou negative.', 'Clique em uma linha para digitar um valor positivo ou negativo.'),
} as const;

const enchantmentCopy = {
    loadingEnchantments: text('Cargando encantamientos...', 'Loading enchantments...', 'Chargement des enchantements...', 'Carregando encantamentos...'),
    titleSublimations: text('Sublimaciones', 'Sublimations', 'Sublimations', 'Sublimacoes'),
    pieceLabel: text('Pieza', 'Item', 'Piece', 'Peca'),
    selectPieceInRunes: text('Selecciona una pieza en Mis runas (columna derecha).', 'Select an item in My runes (right column).', 'Selectionnez une piece dans Mes runes (colonne de droite).', 'Selecione uma peca em Minhas runas (coluna da direita).'),
    normalTier: text('Normal', 'Normal', 'Normale', 'Normal'),
    epicTier: text('Epica', 'Epic', 'Epique', 'Epica'),
    relicTier: text('Reliquia', 'Relic', 'Relique', 'Reliquia'),
    normalSlot: text('Slot normal', 'Normal slot', 'Slot normal', 'Slot normal'),
    epicSlot: text('Slot epico', 'Epic slot', 'Slot epique', 'Slot epico'),
    relicSlot: text('Slot reliquia', 'Relic slot', 'Slot relique', 'Slot reliquia'),
    emptySlot: text('vacio', 'empty', 'vide', 'vazio'),
    conditions: text('Condiciones', 'Conditions', 'Conditions', 'Condicoes'),
    conditionsHelp: text('Activa la situacion que quieras simular', 'Enable the situation you want to simulate', 'Activez la situation que vous voulez simuler', 'Ative a situacao que deseja simular'),
    conditionCountKind: text('Acumulaciones o intensidad', 'Stacks or intensity', 'Cumuls ou intensite', 'Acumulacoes ou intensidade'),
    conditionToggleKind: text('Interruptor de simulacion', 'Simulation toggle', 'Interrupteur de simulation', 'Interruptor de simulacao'),
    active: text('Activo', 'Active', 'Actif', 'Ativo'),
    inactive: text('Inactivo', 'Inactive', 'Inactif', 'Inativo'),
    searchPlaceholder: text('Buscar...', 'Search...', 'Rechercher...', 'Buscar...'),
    filterAll: text('Todas', 'All', 'Toutes', 'Todas'),
    filterNormal: text('Norm.', 'Norm.', 'Norm.', 'Norm.'),
    filterEpicShort: text('Epic.', 'Epic.', 'Epic.', 'Epic.'),
    filterRelicShort: text('Rel.', 'Rel.', 'Rel.', 'Rel.'),
    clear: text('Quitar', 'Clear', 'Retirer', 'Remover'),
    noneCompatible: text('Ninguna compatible con los filtros.', 'None match the current filters.', 'Aucune compatible avec les filtres.', 'Nenhuma compativel com os filtros.'),
    selectPieceMyRunes: text('Selecciona pieza en Mis runas.', 'Select an item in My runes.', 'Selectionnez une piece dans Mes runes.', 'Selecione uma peca em Minhas runas.'),
    myRunes: text('Mis runas', 'My runes', 'Mes runes', 'Minhas runas'),
    myRunesHelp: text('Engarce - color - runa - nivel. Sublimacion: panel izquierdo.', 'Socket - color - rune - level. Sublimation: left panel.', 'Chasse - couleur - rune - niveau. Sublimation : panneau gauche.', 'Encaixe - cor - runa - nivel. Sublimacao: painel esquerdo.'),
    equipToPlan: text('Equipa piezas para empezar a planificar runas y sublimaciones.', 'Equip items to start planning runes and sublimations.', 'Equipez des pieces pour commencer a planifier les runes et sublimations.', 'Equipe pecas para comecar a planejar runas e sublimacoes.'),
    noRuneSlots: text('Este objeto no acepta runas en el builder.', 'This item does not accept runes in the builder.', 'Cet objet n accepte pas de runes dans le builder.', 'Este objeto nao aceita runas no builder.'),
    noEffect: text('Sin efecto', 'No effect', 'Sans effet', 'Sem efeito'),
    noNormalSublimation: text('Sin sublimacion normal', 'No normal sublimation', 'Aucune sublimation normale', 'Sem sublimacao normal'),
    noEpicSublimation: text('Sin sublimacion epica', 'No epic sublimation', 'Aucune sublimation epique', 'Sem sublimacao epica'),
    noRelicSublimation: text('Sin sublimacion reliquia', 'No relic sublimation', 'Aucune sublimation relique', 'Sem sublimacao reliquia'),
    choose: text('Elegir', 'Choose', 'Choisir', 'Escolher'),
    socket: text('Engarce', 'Socket', 'Chasse', 'Encaixe'),
    effect: text('Efecto', 'Effect', 'Effet', 'Efeito'),
    level: text('Nivel', 'Level', 'Niveau', 'Nivel'),
    noRunesOnPiece: text('Sin runas en esta pieza.', 'No runes on this item.', 'Aucune rune sur cette piece.', 'Sem runas nesta peca.'),
    noGamedataEffects: text('Sin efectos detectados en gamedata.', 'No effects detected in gamedata.', 'Aucun effet detecte dans les donnees du jeu.', 'Nenhum efeito detectado no gamedata.'),
    noPattern: text('Sin patron', 'No pattern', 'Sans motif', 'Sem padrao'),
    epicOnly: text('Solo equipo epico', 'Epic gear only', 'Equipement epique uniquement', 'Apenas equipamento epico'),
    relicOnly: text('Solo reliquia', 'Relic only', 'Relique uniquement', 'Apenas reliquia'),
    effects: text('efectos', 'effects', 'effets', 'efeitos'),
    runeColorWhite: text('Blanco', 'White', 'Blanc', 'Branco'),
    runeColorRed: text('Rojo', 'Red', 'Rouge', 'Vermelho'),
    runeColorGreen: text('Verde', 'Green', 'Vert', 'Verde'),
    runeColorBlue: text('Azul', 'Blue', 'Bleu', 'Azul'),
} as const;

const elementLabels = {
    fire: text('Fuego', 'Fire', 'Feu', 'Fogo'),
    water: text('Agua', 'Water', 'Eau', 'Agua'),
    earth: text('Tierra', 'Earth', 'Terre', 'Terra'),
    air: text('Aire', 'Air', 'Air', 'Ar'),
} as const;

const aptitudeSectionLabels = {
    intelligence: text('Inteligencia', 'Intelligence', 'Intelligence', 'Inteligencia'),
    strength: text('Fuerza', 'Strength', 'Force', 'Forca'),
    agility: text('Agilidad', 'Agility', 'Agilite', 'Agilidade'),
    chance: text('Suerte', 'Chance', 'Chance', 'Sorte'),
    major: text('Mayor', 'Major', 'Majeur', 'Maior'),
} as const;

const aptitudeLineLabels = {
    'int-hp-percent': text('% Puntos de Vida', '% Health points', '% Points de vie', '% Pontos de Vida'),
    'int-res': text('Resistencia elemental', 'Elemental resistance', 'Resistance elementaire', 'Resistencia elemental'),
    'int-barrier': text('Barrera', 'Barrier', 'Barriere', 'Barreira'),
    'int-heal-received': text('% Curas recibidas', '% Heals received', '% Soins recus', '% Curas recebidas'),
    'int-armor-hp': text('% Puntos de Vida en armadura', '% Armor HP', '% Points de vie en armure', '% Pontos de Vida em armadura'),
    'str-elemental': text('Dominio elemental', 'Elemental mastery', 'Maitrise elementaire', 'Dominio elemental'),
    'str-melee': text('Dominio melee', 'Melee mastery', 'Maitrise melee', 'Dominio corpo a corpo'),
    'str-distance': text('Dominio distancia', 'Distance mastery', 'Maitrise distance', 'Dominio distancia'),
    'str-hp': text('Puntos de Vida', 'Health points', 'Points de vie', 'Pontos de Vida'),
    'agi-lock': text('Placaje', 'Lock', 'Tacle', 'Trava'),
    'agi-dodge': text('Esquiva', 'Dodge', 'Esquive', 'Esquiva'),
    'agi-initiative': text('Iniciativa', 'Initiative', 'Initiative', 'Iniciativa'),
    'agi-lock-dodge': text('Placaje y Esquiva', 'Lock and Dodge', 'Tacle et Esquive', 'Trava e Esquiva'),
    'agi-will': text('Voluntad', 'Willpower', 'Volonte', 'Vontade'),
    'cha-crit': text('% Golpe critico', '% Critical hit', '% Coup critique', '% Golpe critico'),
    'cha-block': text('% Parada', '% Block', '% Parade', '% Bloqueio'),
    'cha-crit-mastery': text('Dominio critico', 'Critical mastery', 'Maitrise critique', 'Dominio critico'),
    'cha-rear-mastery': text('Dominio espalda', 'Rear mastery', 'Maitrise dos', 'Dominio costas'),
    'cha-berserk': text('Dominio berserker', 'Berserk mastery', 'Maitrise berserk', 'Dominio berserk'),
    'cha-heal': text('Dominio cura', 'Healing mastery', 'Maitrise soin', 'Dominio de cura'),
    'cha-rear-res': text('Resistencia espalda', 'Rear resistance', 'Resistance dos', 'Resistencia costas'),
    'cha-crit-res': text('Resistencia critica', 'Critical resistance', 'Resistance critique', 'Resistencia critica'),
    'maj-ap': text('Punto de Accion', 'Action point', 'Point d action', 'Ponto de Acao'),
    'maj-mp': text('Punto de Movimiento y danos', 'Movement point and damage', 'Point de mouvement et degats', 'Ponto de Movimento e dano'),
    'maj-range': text('Alcance y danos', 'Range and damage', 'Portee et degats', 'Alcance e dano'),
    'maj-wp': text('Punto de Wakfu', 'Wakfu point', 'Point de Wakfu', 'Ponto de Wakfu'),
    'maj-control': text('Control y danos', 'Control and damage', 'Controle et degats', 'Controle e dano'),
    'maj-damage': text('% Danos infligidos', '% Damage inflicted', '% Degats infliges', '% Danos infligidos'),
    'maj-res': text('Resistencia elemental', 'Elemental resistance', 'Resistance elementaire', 'Resistencia elemental'),
} as const;

const exclusiveRuleLabels = {
    8: text('Solo 1 reliquia equipada', 'Only 1 relic equipped', 'Une seule relique equipee', 'Apenas 1 reliquia equipada'),
    12: text('Solo 1 epico equipado', 'Only 1 epic equipped', 'Un seul epique equipe', 'Apenas 1 epico equipado'),
    19: text('Solo 1 item con ranura epica', 'Only 1 item with an epic slot', 'Un seul objet avec emplacement epique', 'Apenas 1 item com slot epico'),
    20: text('Solo 1 item con ranura reliquia', 'Only 1 item with a relic slot', 'Un seul objet avec emplacement relique', 'Apenas 1 item com slot reliquia'),
} as const;

const builderStatLabels: Record<number, LocalizedText> = {
    20: text('PdV', 'HP', 'PV', 'PV'),
    26: text('Dominio cura', 'Healing mastery', 'Maitrise soin', 'Dominio de cura'),
    31: text('PA', 'AP', 'PA', 'PA'),
    39: text('Armadura recibida', 'Armor received', 'Armure recue', 'Armadura recebida'),
    40: text('Armadura dada', 'Armor given', 'Armure donnee', 'Armadura concedida'),
    41: text('PM', 'MP', 'PM', 'PM'),
    71: text('Resistencia espalda', 'Rear resistance', 'Resistance dos', 'Resistencia costas'),
    80: text('Resistencia elemental', 'Elemental resistance', 'Resistance elementaire', 'Resistencia elemental'),
    82: text('Resistencia fuego', 'Fire resistance', 'Resistance feu', 'Resistencia fogo'),
    83: text('Resistencia agua', 'Water resistance', 'Resistance eau', 'Resistencia agua'),
    84: text('Resistencia tierra', 'Earth resistance', 'Resistance terre', 'Resistencia terra'),
    85: text('Resistencia aire', 'Air resistance', 'Resistance air', 'Resistencia ar'),
    120: text('Dominio elemental', 'Elemental mastery', 'Maitrise elementaire', 'Dominio elemental'),
    122: text('Dominio fuego', 'Fire mastery', 'Maitrise feu', 'Dominio fogo'),
    123: text('Dominio tierra', 'Earth mastery', 'Maitrise terre', 'Dominio terra'),
    124: text('Dominio agua', 'Water mastery', 'Maitrise eau', 'Dominio agua'),
    125: text('Dominio aire', 'Air mastery', 'Maitrise air', 'Dominio ar'),
    126: text('Danos infligidos', 'Damage inflicted', 'Degats infliges', 'Danos infligidos'),
    900001: text('Danos indirectos', 'Indirect damage', 'Degats indirects', 'Danos indiretos'),
    900002: text('Danos directos', 'Direct damage', 'Degats directs', 'Danos diretos'),
    149: text('Dominio critico', 'Critical mastery', 'Maitrise critique', 'Dominio critico'),
    150: text('% Golpe critico', '% Critical hit', '% Coup critique', '% Golpe critico'),
    160: text('Alcance', 'Range', 'Portee', 'Alcance'),
    162: text('Prospeccion', 'Prospecting', 'Prospection', 'Prospeccao'),
    166: text('Sabiduria', 'Wisdom', 'Sagesse', 'Sabedoria'),
    171: text('Iniciativa', 'Initiative', 'Initiative', 'Iniciativa'),
    173: text('Placaje', 'Lock', 'Tacle', 'Trava'),
    175: text('Esquiva', 'Dodge', 'Esquive', 'Esquiva'),
    177: text('Voluntad', 'Willpower', 'Volonte', 'Vontade'),
    180: text('Dominio espalda', 'Rear mastery', 'Maitrise dos', 'Dominio costas'),
    191: text('PW', 'WP', 'PW', 'PW'),
    304: text('Control', 'Control', 'Controle', 'Controle'),
    875: text('% Parada', '% Block', '% Parade', '% Bloqueio'),
    988: text('Resistencia critica', 'Critical resistance', 'Resistance critique', 'Resistencia critica'),
    1052: text('Dominio melee', 'Melee mastery', 'Maitrise melee', 'Dominio corpo a corpo'),
    1053: text('Dominio distancia', 'Distance mastery', 'Maitrise distance', 'Dominio distancia'),
    1055: text('Dominio berserker', 'Berserk mastery', 'Maitrise berserk', 'Dominio berserk'),
    1095: text('Curas realizadas', 'Heals performed', 'Soins realises', 'Curas realizadas'),
    45897: text('Armadura', 'Armor', 'Armure', 'Armadura'),
    191191: text('Brisa', 'Breeze', 'Brise', 'Brisa'),
};

export function getBuilderCopy(language: Language) {
    return pickTable(builderCopy, language);
}

export function getEnchantmentCopy(language: Language) {
    return pickTable(enchantmentCopy, language);
}

export function getBuilderElementOptions(language: Language) {
    return (Object.entries(elementLabels) as Array<[keyof typeof elementLabels, LocalizedText]>).map(([value, label]) => ({
        value,
        label: pick(label, language),
    }));
}

export function getBuilderElementLabel(element: keyof typeof elementLabels, language: Language) {
    return pick(elementLabels[element], language);
}

export function getAptitudeSectionLabel(sectionId: string, language: Language) {
    return pick(aptitudeSectionLabels[sectionId as keyof typeof aptitudeSectionLabels] || aptitudeSectionLabels.intelligence, language);
}

export function getAptitudeLineLabel(lineId: string, language: Language) {
    return pick(aptitudeLineLabels[lineId as keyof typeof aptitudeLineLabels] || aptitudeLineLabels['int-hp-percent'], language);
}

export function getExclusivePropertyRuleLabel(propertyId: number, language: Language) {
    return pick(exclusiveRuleLabels[propertyId as keyof typeof exclusiveRuleLabels] || exclusiveRuleLabels[8], language);
}

export function getBuilderStatLabel(actionId: number, language: Language, fallback?: string) {
    const localized = builderStatLabels[actionId];
    return localized ? pick(localized, language) : (fallback || `Stat ${actionId}`);
}

export function getRuneColorLabels(language: Language) {
    const copy = getEnchantmentCopy(language);
    return {
        0: copy.runeColorWhite,
        1: copy.runeColorRed,
        2: copy.runeColorGreen,
        3: copy.runeColorBlue,
    } as Record<number, string>;
}

export function getElementMetricInfo(
    element: keyof typeof elementLabels,
    metric: 'resistance' | 'mastery',
    language: Language,
) {
    const elementLabel = getBuilderElementLabel(element, language);
    if (metric === 'resistance') {
        switch (language) {
            case 'en':
                return `Shows your effective ${elementLabel.toLowerCase()} damage reduction after resistance scaling.`;
            case 'fr':
                return `Affiche votre reduction effective des degats ${elementLabel.toLowerCase()} apres conversion de la resistance.`;
            case 'pt':
                return `Mostra sua reducao efetiva de dano de ${elementLabel.toLowerCase()} apos a conversao da resistencia.`;
            default:
                return `Muestra tu reduccion efectiva del dano de ${elementLabel.toLowerCase()} despues de convertir la resistencia.`;
        }
    }
    switch (language) {
        case 'en':
            return `Represents the ${elementLabel.toLowerCase()} mastery that increases your damage for that element.`;
        case 'fr':
            return `Represente la maitrise ${elementLabel.toLowerCase()} qui augmente vos degats sur cet element.`;
        case 'pt':
            return `Representa o dominio de ${elementLabel.toLowerCase()} que aumenta seu dano nesse elemento.`;
        default:
            return `Representa el dominio de ${elementLabel.toLowerCase()} que aumenta tu dano en ese elemento.`;
    }
}

export function getBuilderStatInfo(actionId: number, label: string, language: Language) {
    const normalized = label.toLowerCase();
    const translations: Record<string, LocalizedText> = {
        hp: text('Define tu reserva total de vida.', 'Defines your total health pool.', 'Definit votre reserve totale de vie.', 'Define sua reserva total de vida.'),
        ap: text('Acciones principales disponibles por turno.', 'Main actions available each turn.', 'Actions principales disponibles par tour.', 'Acoes principais disponiveis por turno.'),
        mp: text('Movilidad base disponible cada turno.', 'Base mobility available each turn.', 'Mobilite de base disponible a chaque tour.', 'Mobilidade base disponivel a cada turno.'),
        wp: text('Recurso de Wakfu para habilidades especiales.', 'Wakfu resource used by special abilities.', 'Ressource Wakfu utilisee par les capacites speciales.', 'Recurso Wakfu usado por habilidades especiais.'),
        breeze: text('Recurso unico del Huppermage mostrado en el build.', 'Huppermage specific resource shown in the build.', 'Ressource specifique du Huppermage affichee dans le build.', 'Recurso especifico do Huppermago exibido na build.'),
        armor: text('Escudo adicional aplicado sobre la vida.', 'Extra protection applied on top of health.', 'Protection supplementaire appliquee au-dessus de la vie.', 'Protecao extra aplicada acima da vida.'),
        mastery: text('Resume el potencial ofensivo global del build.', 'Summarizes the build overall offensive power.', 'Resume le potentiel offensif global du build.', 'Resume o potencial ofensivo geral da build.'),
        crit: text('Aumenta tu probabilidad de golpe critico.', 'Increases your critical hit chance.', 'Augmente votre chance de coup critique.', 'Aumenta sua chance de golpe critico.'),
        block: text('Reduce parte del dano recibido cuando se activa.', 'Reduces part of incoming damage when triggered.', 'Reduit une partie des degats recus lorsqu elle s active.', 'Reduz parte do dano recebido quando ativa.'),
        initiative: text('Ayuda a actuar antes en el orden de turno.', 'Helps you act earlier in turn order.', 'Aide a jouer plus tot dans l ordre des tours.', 'Ajuda a agir antes na ordem de turno.'),
        wisdom: text('Mejora ganancias relacionadas con experiencia y progresion.', 'Improves gains related to experience and progression.', 'Ameliore les gains lies a l experience et a la progression.', 'Melhora ganhos ligados a experiencia e progressao.'),
        prospecting: text('Mejora el potencial de botin y recoleccion fuera del dano directo.', 'Improves loot and gathering potential outside direct damage.', 'Ameliore le potentiel de butin et de collecte en dehors des degats directs.', 'Melhora o potencial de saque e coleta fora do dano direto.'),
        dodge: text('Facilita salir del cuerpo a cuerpo.', 'Makes it easier to leave close combat.', 'Facilite la sortie du corps a corps.', 'Facilita sair do corpo a corpo.'),
        lock: text('Dificulta que el objetivo se aleje de ti.', 'Makes it harder for enemies to move away from you.', 'Rend plus difficile la fuite des ennemis.', 'Dificulta que o alvo se afaste de voce.'),
        range: text('Extiende el alcance de tus hechizos y acciones.', 'Extends the range of your spells and actions.', 'Etend la portee de vos sorts et actions.', 'Aumenta o alcance de seus feitiços e acoes.'),
        control: text('Permite gestionar invocaciones y mecanismos.', 'Supports summons and control mechanics.', 'Soutient les invocations et mecanismes.', 'Ajuda a gerenciar invocacoes e mecanismos.'),
        rear: text('Potencia el dano o la defensa por la espalda.', 'Improves damage or defense related to the rear.', 'Ameliore les degats ou la defense lies au dos.', 'Melhora dano ou defesa relacionados as costas.'),
        heal: text('Aumenta la potencia de tus curas.', 'Improves the strength of your heals.', 'Augmente la puissance de vos soins.', 'Aumenta a potencia das suas curas.'),
        berserk: text('Aumenta el dano cuando estas con poca vida.', 'Raises damage while you are low on health.', 'Augmente les degats quand votre vie est basse.', 'Aumenta o dano quando sua vida esta baixa.'),
        resistance: text('Reduce el dano recibido de forma acumulativa.', 'Reduces incoming damage cumulatively.', 'Reduit les degats recus de facon cumulative.', 'Reduz o dano recebido de forma acumulativa.'),
        damage: text('Incrementa tu dano final o infligido.', 'Increases your final or inflicted damage.', 'Augmente vos degats finaux ou infliges.', 'Aumenta seu dano final ou infligido.'),
    };

    const key =
        actionId === 20 ? 'hp'
            : actionId === 31 ? 'ap'
                : actionId === 41 ? 'mp'
                    : actionId === 191 || actionId === 192 ? 'wp'
                        : actionId === 191191 ? 'breeze'
                            : actionId === 45897 ? 'armor'
                                : actionId === 120 ? 'mastery'
                                    : normalized.includes('crit') ? (normalized.includes('res') ? 'resistance' : 'crit')
                                        : normalized.includes('parada') || normalized.includes('block') ? 'block'
                                            : normalized.includes('inici') ? 'initiative'
                                                : normalized.includes('sabid') || normalized.includes('wisdom') || normalized.includes('sagesse') ? 'wisdom'
                                                    : normalized.includes('prospe') ? 'prospecting'
                                                : normalized.includes('esqu') || normalized.includes('dodge') ? 'dodge'
                                                    : normalized.includes('plac') || normalized.includes('lock') ? 'lock'
                                                        : normalized.includes('alcance') || normalized.includes('portee') || normalized.includes('range') ? 'range'
                                                            : normalized.includes('control') ? 'control'
                                                                : normalized.includes('espalda') || normalized.includes('rear') || normalized.includes('backstab') ? 'rear'
                                                                    : normalized.includes('cura') || normalized.includes('heal') || normalized.includes('soin') ? 'heal'
                                                                        : normalized.includes('berserk') ? 'berserk'
                                                                            : normalized.includes('res') ? 'resistance'
                                                                                : normalized.includes('dano') || normalized.includes('damage') || normalized.includes('degat') ? 'damage'
                                                                                    : 'mastery';

    return pick(translations[key], language);
}
