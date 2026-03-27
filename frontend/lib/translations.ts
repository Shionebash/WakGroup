import { Language } from './language-context';

type TranslationKey = 
  | 'nav.groups'
  | 'nav.dungeons'
  | 'nav.pvp'
  | 'nav.wiki'
  | 'nav.login'
  | 'nav.logout'
  | 'nav.profile'
  | 'common.open'
  | 'common.closed'
  | 'common.full'
  | 'common.loading'
  | 'common.error'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.create'
  | 'common.search'
  | 'common.noResults'
  | 'common.yes'
  | 'common.no'
  | 'common.requiredLevel'
  | 'common.stasis'
  | 'common.steles'
  | 'common.intervention'
  | 'common.language'
  | 'common.languages'
  | 'common.server'
  | 'common.status'
  | 'common.leader'
  | 'common.members'
  | 'group.title'
  | 'group.create'
  | 'group.join'
  | 'group.leave'
  | 'group.kick'
  | 'group.leader'
  | 'group.members'
  | 'group.maxMembers'
  | 'group.dungeon'
  | 'group.server'
  | 'group.status'
  | 'group.equipment'
  | 'group.applications'
  | 'group.accept'
  | 'group.reject'
  | 'group.noGroups'
  | 'group.searchPlaceholder'
  | 'group.createTitle'
  | 'group.selectDungeon'
  | 'group.selectServer'
  | 'group.selectEquipment'
  | 'group.stelesActive'
  | 'group.drops'
  | 'group.selectDrops'
  | 'group.apply'
  | 'group.applicationSent'
  | 'group.close'
  | 'pvp.title'
  | 'pvp.create'
  | 'pvp.join'
  | 'pvp.leave'
  | 'pvp.kick'
  | 'pvp.leader'
  | 'pvp.mode'
  | 'pvp.redTeam'
  | 'pvp.blueTeam'
  | 'pvp.apply'
  | 'pvp.noGroups'
  | 'chat.placeholder'
  | 'chat.send'
  | 'chat.open'
  | 'overlay.notifications'
  | 'notification.newApplication'
  | 'notification.applicationAccepted'
  | 'notification.applicationRejected'
  | 'notification.kicked'
  | 'notification.groupClosed'
  | 'notification.newMessage'
  | 'notification.inactivityPrompt'
  | 'notification.inactivityClosed'
  | 'notification.enableAlerts'
  | 'notification.alertsBlocked'
  | 'notification.alertsActive'
  | 'notification.readAll'
  | 'notification.clearSeen'
  | 'notification.empty'
  | 'notification.now'
  | 'notification.keepLooking'
  | 'notification.confirmed'
  | 'notification.inactivityPromptBody'
  | 'notification.inactivityClosedBody'
  | 'notification.applicationReceivedBody'
  | 'notification.applicationAcceptedBody'
  | 'notification.applicationRejectedBody'
  | 'profile.title'
  | 'profile.characters'
  | 'profile.addCharacter'
  | 'profile.noCharacters'
  | 'profile.yourApplications'
  | 'profile.loginRequired'
  | 'profile.loginDiscord'
  | 'profile.heroEyebrow'
  | 'profile.heroDescription'
  | 'profile.tagDiscord'
  | 'profile.tagModes'
  | 'profile.tagAccount'
  | 'profile.activeSection'
  | 'profile.accountStatus'
  | 'profile.readyToPlay'
  | 'profile.accountNote'
  | 'profile.centerTitle'
  | 'profile.centerSubtitle'
  | 'profile.sectionsCount'
  | 'profile.badge'
  | 'profile.tabCharsEyebrow'
  | 'profile.tabSent'
  | 'profile.tabSentEyebrow'
  | 'profile.tabIncoming'
  | 'profile.tabIncomingEyebrow'
  | 'profile.tabGroups'
  | 'profile.tabGroupsEyebrow'
  | 'profile.tabWikiEyebrow'
  | 'profile.charactersTitle'
  | 'profile.newCharacter'
  | 'profile.editCharacter'
  | 'profile.nameLabel'
  | 'profile.namePlaceholder'
  | 'profile.levelLabel'
  | 'profile.classLabel'
  | 'profile.roleLabel'
  | 'profile.serverLabel'
  | 'profile.saveCharacter'
  | 'profile.updateCharacter'
  | 'profile.emptyCharactersTitle'
  | 'profile.emptyCharactersBody'
  | 'profile.characterAdded'
  | 'profile.characterUpdated'
  | 'profile.characterDeleted'
  | 'profile.deleteCharacterConfirm'
  | 'profile.sentEmptyTitle'
  | 'profile.sentEmptyBody'
  | 'profile.pending'
  | 'profile.accepted'
  | 'profile.rejected'
  | 'profile.incomingEmptyTitle'
  | 'profile.incomingEmptyBody'
  | 'profile.applicationAccepted'
  | 'profile.applicationRejected'
  | 'profile.dungeonGroupsTitle'
  | 'profile.emptyDungeonGroupsTitle'
  | 'profile.emptyDungeonGroupsBody'
  | 'profile.deleteDungeonGroupConfirm'
  | 'profile.groupDeleted'
  | 'profile.pvpGroupsTitle'
  | 'profile.emptyPvpGroupsTitle'
  | 'profile.emptyPvpGroupsBody'
  | 'profile.deletePvpGroupConfirm'
  | 'profile.pvpDeleted'
  | 'profile.emptyPostsTitle'
  | 'profile.emptyPostsBody'
  | 'profile.deleteGuideConfirm'
  | 'profile.guideDeleted'
  | 'dungeon.minLevel'
  | 'dungeon.players'
  | 'dungeon.steles'
  | 'dungeon.boss'
  | 'common.levelShort'
  | 'common.players'
  | 'common.locale'
  | 'common.back'
  | 'common.close'
  | 'home.title'
  | 'home.subtitle'
  | 'home.searchPlaceholder'
  | 'home.allServers'
  | 'home.allLanguages'
  | 'home.anyStasis'
  | 'home.allBands'
  | 'home.bandUpTo'
  | 'home.createGroup'
  | 'home.downloadMiniApp'
  | 'home.emptyTitle'
  | 'home.emptyDesc'
  | 'home.emptyCta'
  | 'dungeons.title'
  | 'dungeons.subtitle'
  | 'dungeons.searchPlaceholder'
  | 'dungeons.allBands'
  | 'dungeons.levelBand'
  | 'dungeons.viewGroups'
  | 'dungeons.createGroup'
  | 'dungeons.eyebrow'
  | 'dungeons.visibleCount'
  | 'dungeons.activeBands'
  | 'dungeons.featuredCount'
  | 'dungeons.filtersHelp'
  | 'dungeons.resultsCount'
  | 'dungeons.suggestedRoute'
  | 'dungeons.featuredTitle'
  | 'dungeons.emptyAlt'
  | 'dungeons.bandEyebrow'
  | 'dungeons.bandCount'
  | 'dungeons.quickActions'
  | 'dungeons.cardDescription'
  | 'dungeons.wiki'
  | 'pvp.subtitle'
  | 'pvp.searchPlaceholder'
  | 'pvp.allLanguages'
  | 'pvp.anyMode'
  | 'pvp.allBands'
  | 'pvp.bandLevel'
  | 'pvp.band'
  | 'pvp.equipmentBand'
  | 'pvp.emptyTitle'
  | 'pvp.emptyDesc'
  | 'pvp.emptyCta'
  | 'wiki.confirmDelete'
  | 'wiki.toastDeleted'
  | 'wiki.errorDelete'
  | 'wiki.title'
  | 'wiki.subtitle'
  | 'wiki.new'
  | 'wiki.searchPlaceholder'
  | 'wiki.emptyTitle'
  | 'wiki.emptyDesc'
  | 'wiki.emptyCta'
  | 'wiki.by'
  | 'wiki.requiredTitle'
  | 'wiki.requiredBody'
  | 'wiki.published'
  | 'wiki.errorPublish'
  | 'wiki.newTitle'
  | 'wiki.dungeon'
  | 'wiki.selectDungeon'
  | 'wiki.titleLabel'
  | 'wiki.titlePlaceholder'
  | 'wiki.contentLabel'
  | 'wiki.contentPlaceholder'
  | 'wiki.contentHint'
  | 'wiki.saving'
  | 'wiki.publish'
  | 'wiki.delete'
  | 'wiki.eyebrow'
  | 'wiki.visibleCount'
  | 'wiki.featuredCount'
  | 'wiki.recentCount'
  | 'wiki.filtersHelp'
  | 'wiki.publicationsCount'
  | 'wiki.featuredEyebrow'
  | 'wiki.featuredTitle'
  | 'wiki.archiveEyebrow'
  | 'wiki.recentTitle'
  | 'wiki.publishEyebrow'
  | 'wiki.bestGuides'
  | 'wiki.guideTip1'
  | 'wiki.guideTip2'
  | 'wiki.guideTip3'
  | 'wiki.exploreEyebrow'
  | 'wiki.quickAccess'
  | 'wiki.preview'
  | 'wiki.previewTitleFallback'
  | 'wiki.previewDungeonFallback'
  | 'wiki.previewBodyFallback'
  | 'wiki.summary'
  | 'wiki.quickContext'
  | 'wiki.dungeonLabel'
  | 'wiki.levelLabel'
  | 'wiki.authorLabel'
  | 'wiki.related'
  | 'wiki.moreFromDungeon'
  | 'wiki.noRelated'
  | 'wiki.browse'
  | 'wiki.backToArchive'
  | 'wiki.moreAboutDungeon'
  | 'group.errorLoad'
  | 'group.selectCharacterError'
  | 'group.errorApply'
  | 'group.confirmDelete'
  | 'group.toastDeleted'
  | 'group.errorDelete'
  | 'group.errorNoCharacters'
  | 'group.confirmLeave'
  | 'group.toastLeft'
  | 'group.errorLeave'
  | 'group.confirmKick'
  | 'group.toastKicked'
  | 'group.errorKick'
  | 'group.confirmClose'
  | 'group.toastClosed'
  | 'group.errorClose'
  | 'group.confirmLeaveLeader'
  | 'group.confirmTransfer'
  | 'group.toastTransfer'
  | 'group.errorTransfer'
  | 'group.dropsHide'
  | 'group.dropsShow'
  | 'group.bossDrops'
  | 'group.noDrops'
  | 'group.membersTitle'
  | 'group.openChat'
  | 'group.chatLocked'
  | 'group.selectCharacter'
  | 'group.selectCharacterPlaceholder'
  | 'group.deleting'
  | 'group.delete'
  | 'group.transfer'
  | 'group.leaveAndTransfer'
  | 'group.errorLoadData'
  | 'group.errorCreate'
  | 'group.character'
  | 'group.languages'
  | 'group.titleOptional'
  | 'group.titlePlaceholder'
  | 'group.stelesCount'
  | 'group.creating'
  | 'footer.owner';

const translations: Record<TranslationKey, Record<Language, string>> = {
  'nav.groups': { es: 'Grupos', en: 'Groups', fr: 'Groupes', pt: 'Grupos' },
  'nav.dungeons': { es: 'Mazmorras', en: 'Dungeons', fr: 'Donjons', pt: 'Calabouços' },
  'nav.pvp': { es: '⚔ VS PVP', en: '⚔ VS PVP', fr: '⚔ VS PVP', pt: '⚔ VS PVP' },
  'nav.wiki': { es: 'Wiki', en: 'Wiki', fr: 'Wiki', pt: 'Wiki' },
  'nav.login': { es: '🔑 Login con Discord', en: '🔑 Login with Discord', fr: '🔑 Connexion Discord', pt: '🔑 Login com Discord' },
  'nav.logout': { es: 'Logout', en: 'Logout', fr: 'Déconnexion', pt: 'Sair' },
  'nav.profile': { es: 'Perfil', en: 'Profile', fr: 'Profil', pt: 'Perfil' },
  'common.open': { es: 'Abierto', en: 'Open', fr: 'Ouvert', pt: 'Aberto' },
  'common.closed': { es: 'Cerrado', en: 'Closed', fr: 'Fermé', pt: 'Fechado' },
  'common.loading': { es: 'Cargando...', en: 'Loading...', fr: 'Chargement...', pt: 'Carregando...' },
  'common.error': { es: 'Error', en: 'Error', fr: 'Erreur', pt: 'Erro' },
  'common.save': { es: 'Guardar', en: 'Save', fr: 'Enregistrer', pt: 'Salvar' },
  'common.cancel': { es: 'Cancelar', en: 'Cancel', fr: 'Annuler', pt: 'Cancelar' },
  'common.delete': { es: 'Eliminar', en: 'Delete', fr: 'Supprimer', pt: 'Excluir' },
  'common.edit': { es: 'Editar', en: 'Edit', fr: 'Modifier', pt: 'Editar' },
  'common.create': { es: 'Crear', en: 'Create', fr: 'Créer', pt: 'Criar' },
  'common.search': { es: 'Buscar', en: 'Search', fr: 'Rechercher', pt: 'Buscar' },
  'common.noResults': { es: 'Sin resultados', en: 'No results', fr: 'Aucun résultat', pt: 'Sem resultados' },
  'common.yes': { es: 'Sí', en: 'Yes', fr: 'Oui', pt: 'Sim' },
  'common.no': { es: 'No', en: 'No', fr: 'Non', pt: 'Não' },
  'common.requiredLevel': { es: 'Nivel Requerido', en: 'Required Level', fr: 'Niveau Requis', pt: 'Nível Requerido' },
  'common.stasis': { es: 'Stasis', en: 'Stasis', fr: 'Stase', pt: 'Stasis' },
  'common.steles': { es: 'Estelas', en: 'Steles', fr: 'Stèles', pt: 'Estátuas' },
  'common.intervention': { es: 'Intervención', en: 'Intervention', fr: 'Intervention', pt: 'Intervenção' },
  'common.language': { es: 'Idioma', en: 'Language', fr: 'Langue', pt: 'Idioma' },
  'common.languages': { es: 'Idiomas', en: 'Languages', fr: 'Langues', pt: 'Idiomas' },
  'common.server': { es: 'Servidor', en: 'Server', fr: 'Serveur', pt: 'Servidor' },
  'common.status': { es: 'Estado', en: 'Status', fr: 'Statut', pt: 'Status' },
  'common.leader': { es: 'Líder', en: 'Leader', fr: 'Chef', pt: 'Líder' },
  'common.members': { es: 'Miembros', en: 'Members', fr: 'Membres', pt: 'Membros' },
  'group.title': { es: 'Grupo', en: 'Group', fr: 'Groupe', pt: 'Grupo' },
  'group.create': { es: 'Crear Grupo', en: 'Create Group', fr: 'Créer un groupe', pt: 'Criar Grupo' },
  'group.join': { es: 'Unirse', en: 'Join', fr: 'Rejoindre', pt: 'Entrar' },
  'group.leave': { es: 'Salir del grupo', en: 'Leave group', fr: 'Quitter le groupe', pt: 'Sair do grupo' },
  'group.kick': { es: 'Expulsar', en: 'Kick', fr: 'Expulser', pt: 'Expulsar' },
  'group.leader': { es: 'Líder', en: 'Leader', fr: 'Chef', pt: 'Líder' },
  'group.members': { es: 'Miembros', en: 'Members', fr: 'Membres', pt: 'Membros' },
  'group.maxMembers': { es: 'Máx. miembros', en: 'Max members', fr: 'Membres max', pt: 'Máx. membros' },
  'group.dungeon': { es: 'Mazmorra', en: 'Dungeon', fr: 'Donjon', pt: 'Calabouço' },
  'group.server': { es: 'Servidor', en: 'Server', fr: 'Serveur', pt: 'Servidor' },
  'group.status': { es: 'Estado', en: 'Status', fr: 'Statut', pt: 'Status' },
  'group.equipment': { es: 'Equipo', en: 'Equipment', fr: 'Équipement', pt: 'Equipamento' },
  'group.applications': { es: 'Solicitudes', en: 'Applications', fr: 'Demandes', pt: 'Candidaturas' },
  'group.accept': { es: 'Aceptar', en: 'Accept', fr: 'Accepter', pt: 'Aceitar' },
  'group.reject': { es: 'Rechazar', en: 'Reject', fr: 'Refuser', pt: 'Rejeitar' },
  'group.noGroups': { es: 'No hay grupos disponibles', en: 'No groups available', fr: 'Aucun groupe disponible', pt: 'Nenhum grupo disponível' },
  'group.searchPlaceholder': { es: 'Buscar grupos...', en: 'Search groups...', fr: 'Rechercher des groupes...', pt: 'Buscar grupos...' },
  'group.createTitle': { es: 'Crear nuevo grupo', en: 'Create new group', fr: 'Créer un nouveau groupe', pt: 'Criar novo grupo' },
  'group.selectDungeon': { es: 'Selecciona mazmorra', en: 'Select dungeon', fr: 'Sélectionner un donjon', pt: 'Selecionar calabouço' },
  'group.selectServer': { es: 'Selecciona servidor', en: 'Select server', fr: 'Sélectionner un serveur', pt: 'Selecionar servidor' },
  'group.selectEquipment': { es: 'Banda de equipo', en: 'Equipment band', fr: 'Bande d\'équipement', pt: 'Banda de equipamento' },
  'group.stelesActive': { es: 'Estelas activas', en: 'Steles active', fr: 'Stèles actives', pt: 'Estátuas ativas' },
  'group.drops': { es: 'Drops', en: 'Drops', fr: 'Drops', pt: 'Drops' },
  'group.selectDrops': { es: 'Seleccionar drops', en: 'Select drops', fr: 'Sélectionner drops', pt: 'Selecionar drops' },
  'group.apply': { es: 'Solicitar Unirse', en: 'Apply to join', fr: 'Postuler', pt: 'Candidatar' },
  'group.applicationSent': { es: '¡Solicitud enviada!', en: 'Application sent!', fr: 'Demande envoyée!', pt: 'Candidatura enviada!' },
  'group.close': { es: 'Cerrar grupo', en: 'Close group', fr: 'Fermer le groupe', pt: 'Fechar grupo' },
  'common.full': { es: 'Lleno', en: 'Full', fr: 'Plein', pt: 'Cheio' },
  'pvp.title': { es: 'Enfrentamiento PVP', en: 'PVP Match', fr: 'Match PVP', pt: 'Confronto PVP' },
  'pvp.create': { es: 'Crear Enfrentamiento', en: 'Create Match', fr: 'Créer un match', pt: 'Criar Confronto' },
  'pvp.join': { es: 'Unirse', en: 'Join', fr: 'Rejoindre', pt: 'Entrar' },
  'pvp.leave': { es: 'Salir', en: 'Leave', fr: 'Quitter', pt: 'Sair' },
  'pvp.kick': { es: 'Expulsar', en: 'Kick', fr: 'Expulser', pt: 'Expulsar' },
  'pvp.leader': { es: 'Líder', en: 'Leader', fr: 'Chef', pt: 'Líder' },
  'pvp.mode': { es: 'Modo', en: 'Mode', fr: 'Mode', pt: 'Modo' },
  'pvp.redTeam': { es: 'Equipo Rojo', en: 'Red Team', fr: 'Équipe Rouge', pt: 'Equipe Vermelha' },
  'pvp.blueTeam': { es: 'Equipo Azul', en: 'Blue Team', fr: 'Équipe Bleue', pt: 'Equipe Azul' },
  'pvp.apply': { es: 'Solicitar', en: 'Apply', fr: 'Postuler', pt: 'Candidatar' },
  'pvp.noGroups': { es: 'No hay enfrentamientos disponibles', en: 'No matches available', fr: 'Aucun match disponible', pt: 'Nenhum confronto disponível' },
  'chat.placeholder': { es: 'Escribe un mensaje...', en: 'Write a message...', fr: 'Écrire un message...', pt: 'Escreva uma mensagem...' },
  'chat.send': { es: 'Enviar', en: 'Send', fr: 'Envoyer', pt: 'Enviar' },
  'chat.open': { es: 'Abrir chat', en: 'Open chat', fr: 'Ouvrir le chat', pt: 'Abrir chat' },
  'overlay.notifications': { es: 'Notificaciones', en: 'Notifications', fr: 'Notifications', pt: 'Notificações' },
  'notification.newApplication': { es: 'Nueva solicitud', en: 'New application', fr: 'Nouvelle demande', pt: 'Nova candidatura' },
  'notification.applicationAccepted': { es: 'Solicitud aceptada', en: 'Application accepted', fr: 'Demande acceptée', pt: 'Candidatura aceita' },
  'notification.applicationRejected': { es: 'Solicitud rechazada', en: 'Application rejected', fr: 'Demande refusée', pt: 'Candidatura rejeitada' },
  'notification.kicked': { es: 'Has sido expulsado del grupo', en: 'You have been kicked from the group', fr: 'Vous avez été expulsé du groupe', pt: 'Você foi expulso do grupo' },
  'notification.groupClosed': { es: 'El grupo ha sido cerrado', en: 'The group has been closed', fr: 'Le groupe a été fermé', pt: 'O grupo foi fechado' },
  'notification.newMessage': { es: 'Nuevo mensaje', en: 'New message', fr: 'Nouveau message', pt: 'Nova mensagem' },
  'notification.inactivityPrompt': { es: 'Confirmación de actividad', en: 'Activity confirmation', fr: 'Confirmation d\'activité', pt: 'Confirmação de atividade' },
  'notification.inactivityClosed': { es: 'Grupo cerrado por inactividad', en: 'Group closed due to inactivity', fr: 'Groupe fermé pour inactivité', pt: 'Grupo fechado por inatividade' },
  'notification.enableAlerts': { es: 'Activar avisos', en: 'Enable alerts', fr: 'Activer les alertes', pt: 'Ativar alertas' },
  'notification.alertsBlocked': { es: 'Avisos bloqueados', en: 'Alerts blocked', fr: 'Alertes bloquées', pt: 'Alertas bloqueados' },
  'notification.alertsActive': { es: 'Avisos activos', en: 'Alerts active', fr: 'Alertes actives', pt: 'Alertas ativos' },
  'notification.readAll': { es: 'Leer todo', en: 'Read all', fr: 'Tout lire', pt: 'Ler tudo' },
  'notification.clearSeen': { es: 'Limpiar vistas', en: 'Clear seen', fr: 'Effacer les vues', pt: 'Limpar vistas' },
  'notification.empty': { es: 'Sin notificaciones', en: 'No notifications', fr: 'Aucune notification', pt: 'Sem notificações' },
  'notification.now': { es: 'ahora', en: 'now', fr: 'maintenant', pt: 'agora' },
  'notification.keepLooking': { es: 'Seguir buscando', en: 'Keep looking', fr: 'Continuer à chercher', pt: 'Continuar procurando' },
  'notification.confirmed': { es: 'Confirmado', en: 'Confirmed', fr: 'Confirmé', pt: 'Confirmado' },
  'notification.inactivityPromptBody': { es: 'Tu grupo "{title}" lleva 1 hora sin actividad. ¿Sigues buscando grupo?', en: 'Your group "{title}" has been inactive for 1 hour. Are you still looking for a group?', fr: 'Votre groupe "{title}" est inactif depuis 1 heure. Cherchez-vous toujours un groupe ?', pt: 'Seu grupo "{title}" está sem atividade há 1 hora. Você ainda está procurando grupo?' },
  'notification.inactivityClosedBody': { es: 'El grupo "{title}" se cerró automáticamente por inactividad.', en: 'The group "{title}" was automatically closed due to inactivity.', fr: 'Le groupe "{title}" a été fermé automatiquement pour inactivité.', pt: 'O grupo "{title}" foi fechado automaticamente por inatividade.' },
  'notification.applicationReceivedBody': { es: '{user} quiere unirse con {char}', en: '{user} wants to join with {char}', fr: '{user} veut rejoindre avec {char}', pt: '{user} quer entrar com {char}' },
  'notification.applicationAcceptedBody': { es: 'Tu solicitud fue aceptada.', en: 'Your application was accepted.', fr: 'Votre candidature a été acceptée.', pt: 'Sua candidatura foi aceita.' },
  'notification.applicationRejectedBody': { es: 'Tu solicitud fue rechazada.', en: 'Your application was rejected.', fr: 'Votre candidature a été refusée.', pt: 'Sua candidatura foi recusada.' },
  'profile.title': { es: 'Perfil', en: 'Profile', fr: 'Profil', pt: 'Perfil' },
  'profile.characters': { es: 'Personajes', en: 'Characters', fr: 'Personnages', pt: 'Personagens' },
  'profile.addCharacter': { es: 'Añadir personaje', en: 'Add character', fr: 'Ajouter un personnage', pt: 'Adicionar personagem' },
  'profile.noCharacters': { es: 'No tienes personajes', en: 'You have no characters', fr: 'Vous n\'avez pas de personnages', pt: 'Você não tem personagens' },
  'profile.yourApplications': { es: 'Tus solicitudes', en: 'Your applications', fr: 'Vos demandes', pt: 'Suas candidaturas' },
  'dungeon.minLevel': { es: 'Nivel mínimo', en: 'Min level', fr: 'Niveau minimum', pt: 'Nível mínimo' },
  'dungeon.players': { es: 'Jugadores', en: 'Players', fr: 'Joueurs', pt: 'Jogadores' },
  'dungeon.steles': { es: 'Estelas', en: 'Steles', fr: 'Stèles', pt: 'Estátuas' },
  'dungeon.boss': { es: 'Jefe', en: 'Boss', fr: 'Boss', pt: 'Chefe' },
  'common.levelShort': { es: 'Nv.', en: 'Lv.', fr: 'Nv.', pt: 'Nv.' },
  'common.players': { es: 'jugadores', en: 'players', fr: 'joueurs', pt: 'jogadores' },
  'common.locale': { es: 'es-ES', en: 'en-US', fr: 'fr-FR', pt: 'pt-PT' },
  'common.back': { es: 'Volver', en: 'Back', fr: 'Retour', pt: 'Voltar' },
  'home.title': { es: 'Buscar Grupo', en: 'Find Group', fr: 'Trouver un groupe', pt: 'Encontrar grupo' },
  'home.subtitle': { es: 'Encuentra tu party, conquista las mazmorras del mundo de los Doce.', en: 'Find your party and conquer the dungeons of the World of Twelve.', fr: 'Trouvez votre équipe et conquérez les donjons du Monde des Douze.', pt: 'Encontre seu grupo e conquiste as masmorras do Mundo dos Doze.' },
  'home.searchPlaceholder': { es: 'Buscar por mazmorra o título...', en: 'Search by dungeon or title...', fr: 'Rechercher par donjon ou titre...', pt: 'Buscar por masmorra ou título...' },
  'home.allServers': { es: 'Todos los servidores', en: 'All servers', fr: 'Tous les serveurs', pt: 'Todos os servidores' },
  'home.allLanguages': { es: 'Todos los idiomas', en: 'All languages', fr: 'Toutes les langues', pt: 'Todos os idiomas' },
  'home.anyStasis': { es: 'Cualquier Stasis', en: 'Any Stasis', fr: 'Stasis quelconque', pt: 'Qualquer Stasis' },
  'home.allBands': { es: 'Todas las franjas', en: 'All bands', fr: 'Toutes les tranches', pt: 'Todas as faixas' },
  'home.bandUpTo': { es: 'Hasta Nv. {level}', en: 'Up to Lv. {level}', fr: 'Jusqu\'au niv. {level}', pt: 'Até Nv. {level}' },
  'home.createGroup': { es: 'Crear Grupo', en: 'Create Group', fr: 'Créer un groupe', pt: 'Criar Grupo' },
  'home.downloadMiniApp': { es: 'Descargar mini app', en: 'Download mini app', fr: 'Télécharger la mini app', pt: 'Baixar mini app' },
  'home.emptyTitle': { es: 'Sin grupos disponibles', en: 'No groups available', fr: 'Aucun groupe disponible', pt: 'Nenhum grupo disponível' },
  'home.emptyDesc': { es: 'No hay grupos activos con estos filtros. ¡Crea el tuyo!', en: 'No active groups with these filters. Create yours!', fr: 'Aucun groupe actif avec ces filtres. Créez le vôtre !', pt: 'Não há grupos ativos com esses filtros. Crie o seu!' },
  'home.emptyCta': { es: 'Crear el primer grupo', en: 'Create the first group', fr: 'Créer le premier groupe', pt: 'Criar o primeiro grupo' },
  'dungeons.title': { es: 'Mazmorras', en: 'Dungeons', fr: 'Donjons', pt: 'Masmorras' },
  'dungeons.subtitle': { es: 'Todas las mazmorras del mundo de los Doce', en: 'All dungeons in the World of Twelve', fr: 'Tous les donjons du Monde des Douze', pt: 'Todas as masmorras do Mundo dos Doze' },
  'dungeons.searchPlaceholder': { es: 'Buscar mazmorra...', en: 'Search dungeon...', fr: 'Rechercher un donjon...', pt: 'Buscar masmorra...' },
  'dungeons.allBands': { es: 'Todas las franjas', en: 'All bands', fr: 'Toutes les tranches', pt: 'Todas as faixas' },
  'dungeons.levelBand': { es: 'Nivel {level}', en: 'Level {level}', fr: 'Niveau {level}', pt: 'Nível {level}' },
  'dungeons.viewGroups': { es: 'Ver grupos', en: 'View groups', fr: 'Voir les groupes', pt: 'Ver grupos' },
  'dungeons.createGroup': { es: 'Crear grupo', en: 'Create group', fr: 'Créer un groupe', pt: 'Criar grupo' },
  'pvp.subtitle': { es: 'Encuentra rivales para enfrentamientos PVP. Desde 1v1 hasta 6v6 — demuestra tu fuerza.', en: 'Find rivals for PVP matches. From 1v1 up to 6v6 — prove your strength.', fr: 'Trouvez des adversaires pour des matchs PVP. De 1v1 jusqu\'au 6v6 — montrez votre puissance.', pt: 'Encontre rivais para confrontos PVP. De 1v1 até 6v6 — mostre sua força.' },
  'pvp.searchPlaceholder': { es: 'Buscar por título...', en: 'Search by title...', fr: 'Rechercher par titre...', pt: 'Buscar por título...' },
  'pvp.allLanguages': { es: 'Todos los idiomas', en: 'All languages', fr: 'Toutes les langues', pt: 'Todos os idiomas' },
  'pvp.anyMode': { es: 'Cualquier modo', en: 'Any mode', fr: 'Tous les modes', pt: 'Qualquer modo' },
  'pvp.allBands': { es: 'Todas las franjas', en: 'All bands', fr: 'Toutes les tranches', pt: 'Todas as faixas' },
  'pvp.bandLevel': { es: 'Franja Nv. {level}', en: 'Band Lv. {level}', fr: 'Tranche niv. {level}', pt: 'Faixa Nv. {level}' },
  'pvp.band': { es: 'Franja', en: 'Band', fr: 'Tranche', pt: 'Faixa' },
  'pvp.equipmentBand': { es: 'Equipamiento Nv. {level}', en: 'Equipment Lv. {level}', fr: 'Équipement niv. {level}', pt: 'Equipamento Nv. {level}' },
  'pvp.emptyTitle': { es: 'Sin enfrentamientos disponibles', en: 'No matches available', fr: 'Aucun match disponible', pt: 'Nenhum confronto disponível' },
  'pvp.emptyDesc': { es: 'No hay grupos PVP activos con estos filtros. ¡Crea el tuyo!', en: 'No active PVP groups with these filters. Create yours!', fr: 'Aucun groupe PVP actif avec ces filtres. Créez le vôtre !', pt: 'Não há grupos PVP ativos com esses filtros. Crie o seu!' },
  'pvp.emptyCta': { es: 'Crear el primer enfrentamiento', en: 'Create the first match', fr: 'Créer le premier match', pt: 'Criar o primeiro confronto' },
  'wiki.confirmDelete': { es: '¿Eliminar esta guía?', en: 'Delete this guide?', fr: 'Supprimer ce guide ?', pt: 'Excluir este guia?' },
  'wiki.toastDeleted': { es: '🗑 Guía eliminada', en: '🗑 Guide deleted', fr: '🗑 Guide supprimé', pt: '🗑 Guia excluído' },
  'wiki.errorDelete': { es: 'Error al eliminar.', en: 'Error deleting.', fr: 'Erreur de suppression.', pt: 'Erro ao excluir.' },
  'wiki.title': { es: 'Wiki', en: 'Wiki', fr: 'Wiki', pt: 'Wiki' },
  'wiki.subtitle': { es: 'Guías, estrategias y consejos de la comunidad', en: 'Guides, strategies, and community tips', fr: 'Guides, stratégies et conseils de la communauté', pt: 'Guias, estratégias e dicas da comunidade' },
  'wiki.new': { es: 'Nueva guía', en: 'New guide', fr: 'Nouveau guide', pt: 'Novo guia' },
  'wiki.searchPlaceholder': { es: 'Buscar por nombre o mazmorra...', en: 'Search by name or dungeon...', fr: 'Rechercher par nom ou donjon...', pt: 'Buscar por nome ou masmorra...' },
  'wiki.emptyTitle': { es: 'La wiki está vacía', en: 'The wiki is empty', fr: 'Le wiki est vide', pt: 'A wiki está vazia' },
  'wiki.emptyDesc': { es: 'Sé el primero en compartir estrategias con la comunidad.', en: 'Be the first to share strategies with the community.', fr: 'Soyez le premier à partager des stratégies avec la communauté.', pt: 'Seja o primeiro a compartilhar estratégias com a comunidade.' },
  'wiki.emptyCta': { es: 'Crear primera guía', en: 'Create the first guide', fr: 'Créer le premier guide', pt: 'Criar o primeiro guia' },
  'wiki.by': { es: 'Por {user}', en: 'By {user}', fr: 'Par {user}', pt: 'Por {user}' },
  'wiki.requiredTitle': { es: '⚠️ Campos requeridos', en: '⚠️ Required fields', fr: '⚠️ Champs requis', pt: '⚠️ Campos obrigatórios' },
  'wiki.requiredBody': { es: 'Completa todos los campos.', en: 'Please complete all fields.', fr: 'Veuillez remplir tous les champs.', pt: 'Preencha todos os campos.' },
  'wiki.published': { es: '✅ Guía publicada', en: '✅ Guide published', fr: '✅ Guide publié', pt: '✅ Guia publicado' },
  'wiki.errorPublish': { es: 'Error al publicar.', en: 'Error publishing.', fr: 'Erreur de publication.', pt: 'Erro ao publicar.' },
  'wiki.newTitle': { es: 'Nueva Guía Wiki', en: 'New Wiki Guide', fr: 'Nouveau guide Wiki', pt: 'Novo guia da Wiki' },
  'wiki.dungeon': { es: 'Mazmorra', en: 'Dungeon', fr: 'Donjon', pt: 'Masmorra' },
  'wiki.selectDungeon': { es: '— Selecciona mazmorra —', en: '— Select dungeon —', fr: '— Sélectionner un donjon —', pt: '— Selecione uma masmorra —' },
  'wiki.titleLabel': { es: 'Título', en: 'Title', fr: 'Titre', pt: 'Título' },
  'wiki.titlePlaceholder': { es: 'Guía de...', en: 'Guide to...', fr: 'Guide sur...', pt: 'Guia de...' },
  'wiki.contentLabel': { es: 'Contenido (soporta HTML, iframes de YouTube)', en: 'Content (supports HTML, YouTube iframes)', fr: 'Contenu (prend en charge le HTML, iframes YouTube)', pt: 'Conteúdo (suporta HTML, iframes do YouTube)' },
  'wiki.contentPlaceholder': { es: '<p>Descripción de la mazmorra...</p>\n\n<h2>Mecánicas del jefe</h2>\n<p>...</p>\n\n<iframe src=\"https://www.youtube.com/embed/VIDEO_ID\"></iframe>', en: '<p>Dungeon description...</p>\n\n<h2>Boss mechanics</h2>\n<p>...</p>\n\n<iframe src=\"https://www.youtube.com/embed/VIDEO_ID\"></iframe>', fr: '<p>Description du donjon...</p>\n\n<h2>Mécaniques du boss</h2>\n<p>...</p>\n\n<iframe src=\"https://www.youtube.com/embed/VIDEO_ID\"></iframe>', pt: '<p>Descrição da masmorra...</p>\n\n<h2>Mecânicas do chefe</h2>\n<p>...</p>\n\n<iframe src=\"https://www.youtube.com/embed/VIDEO_ID\"></iframe>' },
  'wiki.contentHint': { es: 'El HTML será saneado automáticamente. Los scripts serán eliminados.', en: 'HTML will be sanitized automatically. Scripts will be removed.', fr: 'Le HTML sera nettoyé automatiquement. Les scripts seront supprimés.', pt: 'O HTML será sanitizado automaticamente. Scripts serão removidos.' },
  'wiki.saving': { es: 'Guardando...', en: 'Saving...', fr: 'Enregistrement...', pt: 'Salvando...' },
  'wiki.publish': { es: 'Publicar guía', en: 'Publish guide', fr: 'Publier le guide', pt: 'Publicar guia' },
  'wiki.delete': { es: 'Eliminar guía', en: 'Delete guide', fr: 'Supprimer le guide', pt: 'Excluir guia' },
  'wiki.eyebrow': { es: 'Base de conocimiento', en: 'Knowledge base', fr: 'Base de connaissances', pt: 'Base de conhecimento' },
  'wiki.visibleCount': { es: 'Guias visibles', en: 'Visible guides', fr: 'Guides visibles', pt: 'Guias visiveis' },
  'wiki.featuredCount': { es: 'Destacadas', en: 'Featured', fr: 'Mises en avant', pt: 'Destaques' },
  'wiki.recentCount': { es: 'Recientes', en: 'Recent', fr: 'Recents', pt: 'Recentes' },
  'wiki.filtersHelp': { es: 'Filtra por mazmorra, franja o texto y descubre guias relacionadas sin perder contexto.', en: 'Filter by dungeon, band, or text and discover related guides without losing context.', fr: 'Filtrez par donjon, tranche ou texte et decouvrez des guides lies sans perdre le contexte.', pt: 'Filtre por masmorra, faixa ou texto e descubra guias relacionadas sem perder contexto.' },
  'wiki.publicationsCount': { es: '{count} publicaciones', en: '{count} posts', fr: '{count} publications', pt: '{count} publicacoes' },
  'wiki.featuredEyebrow': { es: 'Lectura destacada', en: 'Featured reading', fr: 'Lecture mise en avant', pt: 'Leitura em destaque' },
  'wiki.featuredTitle': { es: 'Guias para entrar rapido en contexto', en: 'Guides to get up to speed fast', fr: 'Guides pour entrer rapidement dans le contexte', pt: 'Guias para entrar rapido no contexto' },
  'wiki.archiveEyebrow': { es: 'Archivo', en: 'Archive', fr: 'Archive', pt: 'Arquivo' },
  'wiki.recentTitle': { es: 'Guias recientes', en: 'Recent guides', fr: 'Guides recents', pt: 'Guias recentes' },
  'wiki.publishEyebrow': { es: 'Como publicar', en: 'How to publish', fr: 'Comment publier', pt: 'Como publicar' },
  'wiki.bestGuides': { es: 'Guias mas utiles', en: 'Most useful guides', fr: 'Guides les plus utiles', pt: 'Guias mais uteis' },
  'wiki.guideTip1': { es: 'Empieza por la mecanica general del encuentro.', en: 'Start with the overall encounter mechanics.', fr: 'Commencez par les mecaniques generales du combat.', pt: 'Comece pela mecanica geral do encontro.' },
  'wiki.guideTip2': { es: 'Resume composicion, posicionamiento y errores comunes.', en: 'Summarize composition, positioning, and common mistakes.', fr: 'Resumez la composition, le positionnement et les erreurs courantes.', pt: 'Resuma composicao, posicionamento e erros comuns.' },
  'wiki.guideTip3': { es: 'Deja recomendaciones accionables al final.', en: 'Leave actionable recommendations at the end.', fr: 'Laissez des recommandations actionnables a la fin.', pt: 'Deixe recomendacoes praticas no final.' },
  'wiki.exploreEyebrow': { es: 'Exploracion', en: 'Explore', fr: 'Exploration', pt: 'Exploracao' },
  'wiki.quickAccess': { es: 'Accesos rapidos', en: 'Quick access', fr: 'Acces rapides', pt: 'Acessos rapidos' },
  'wiki.preview': { es: 'Vista previa', en: 'Preview', fr: 'Apercu', pt: 'Pre-visualizacao' },
  'wiki.previewTitleFallback': { es: 'Tu guia aparecera aqui', en: 'Your guide will appear here', fr: 'Votre guide apparaitra ici', pt: 'Seu guia aparecera aqui' },
  'wiki.previewDungeonFallback': { es: 'Selecciona una mazmorra para dar contexto a tu guia.', en: 'Select a dungeon to give your guide context.', fr: 'Selectionnez un donjon pour donner du contexte a votre guide.', pt: 'Selecione uma masmorra para dar contexto ao seu guia.' },
  'wiki.previewBodyFallback': { es: 'Resume mecanicas, composicion, posicionamiento y errores comunes.', en: 'Summarize mechanics, composition, positioning, and common mistakes.', fr: 'Resumez les mecaniques, la composition, le positionnement et les erreurs courantes.', pt: 'Resuma mecanicas, composicao, posicionamento e erros comuns.' },
  'wiki.summary': { es: 'Resumen', en: 'Summary', fr: 'Resume', pt: 'Resumo' },
  'wiki.quickContext': { es: 'Contexto rapido', en: 'Quick context', fr: 'Contexte rapide', pt: 'Contexto rapido' },
  'wiki.dungeonLabel': { es: 'Mazmorra:', en: 'Dungeon:', fr: 'Donjon :', pt: 'Masmorra:' },
  'wiki.levelLabel': { es: 'Nivel:', en: 'Level:', fr: 'Niveau :', pt: 'Nivel:' },
  'wiki.authorLabel': { es: 'Autor:', en: 'Author:', fr: 'Auteur :', pt: 'Autor:' },
  'wiki.related': { es: 'Relacionadas', en: 'Related', fr: 'Liees', pt: 'Relacionadas' },
  'wiki.moreFromDungeon': { es: 'Mas guias de esta mazmorra', en: 'More guides for this dungeon', fr: 'Plus de guides pour ce donjon', pt: 'Mais guias desta masmorra' },
  'wiki.noRelated': { es: 'Aun no hay otras publicaciones para esta mazmorra.', en: 'There are no other posts for this dungeon yet.', fr: 'Il n y a pas encore d autres publications pour ce donjon.', pt: 'Ainda nao ha outras publicacoes para esta masmorra.' },
  'wiki.browse': { es: 'Explorar', en: 'Browse', fr: 'Explorer', pt: 'Explorar' },
  'wiki.backToArchive': { es: 'Volver al archivo', en: 'Back to archive', fr: 'Retour aux archives', pt: 'Voltar ao arquivo' },
  'wiki.moreAboutDungeon': { es: 'Ver mas sobre {dungeon}', en: 'See more about {dungeon}', fr: 'Voir plus sur {dungeon}', pt: 'Ver mais sobre {dungeon}' },
  'dungeons.eyebrow': { es: 'Atlas PvE', en: 'PvE Atlas', fr: 'Atlas PvE', pt: 'Atlas PvE' },
  'dungeons.visibleCount': { es: 'Mazmorras visibles', en: 'Visible dungeons', fr: 'Donjons visibles', pt: 'Masmorras visiveis' },
  'dungeons.activeBands': { es: 'Franjas activas', en: 'Active bands', fr: 'Tranches actives', pt: 'Faixas ativas' },
  'dungeons.featuredCount': { es: 'Destacadas', en: 'Featured', fr: 'Mises en avant', pt: 'Destaques' },
  'dungeons.filtersHelp': { es: 'Explora por nombre o franja y salta directo a crear grupo o abrir la wiki.', en: 'Browse by name or band and jump straight into creating a group or opening the wiki.', fr: 'Explorez par nom ou tranche et accedez directement a la creation de groupe ou au wiki.', pt: 'Explore por nome ou faixa e va direto para criar grupo ou abrir a wiki.' },
  'dungeons.resultsCount': { es: '{count} resultados', en: '{count} results', fr: '{count} resultats', pt: '{count} resultados' },
  'dungeons.suggestedRoute': { es: 'Ruta sugerida', en: 'Suggested route', fr: 'Parcours suggere', pt: 'Rota sugerida' },
  'dungeons.featuredTitle': { es: 'Mazmorras destacadas', en: 'Featured dungeons', fr: 'Donjons a la une', pt: 'Masmorras em destaque' },
  'dungeons.emptyAlt': { es: 'Prueba otra combinacion de busqueda para descubrir nuevas rutas.', en: 'Try another search combination to discover new routes.', fr: 'Essayez une autre combinaison de recherche pour decouvrir de nouvelles routes.', pt: 'Teste outra combinacao de busca para descobrir novas rotas.' },
  'dungeons.bandEyebrow': { es: 'Franja', en: 'Band', fr: 'Tranche', pt: 'Faixa' },
  'dungeons.bandCount': { es: '{count} mazmorras', en: '{count} dungeons', fr: '{count} donjons', pt: '{count} masmorras' },
  'dungeons.quickActions': { es: 'Grupos y guias en un clic', en: 'Groups and guides in one click', fr: 'Groupes et guides en un clic', pt: 'Grupos e guias em um clique' },
  'dungeons.cardDescription': { es: 'Encuentra grupos activos o crea una convocatoria enfocada en esta mazmorra.', en: 'Find active groups or create a call focused on this dungeon.', fr: 'Trouvez des groupes actifs ou creez un appel cible sur ce donjon.', pt: 'Encontre grupos ativos ou crie uma chamada focada nesta masmorra.' },
  'dungeons.wiki': { es: 'Wiki', en: 'Wiki', fr: 'Wiki', pt: 'Wiki' },
  'common.close': { es: 'Cerrar', en: 'Close', fr: 'Fermer', pt: 'Fechar' },
  'group.errorLoad': { es: 'Error al cargar grupo', en: 'Error loading group', fr: 'Erreur de chargement du groupe', pt: 'Erro ao carregar grupo' },
  'group.selectCharacterError': { es: 'Selecciona un personaje', en: 'Select a character', fr: 'Sélectionnez un personnage', pt: 'Selecione um personagem' },
  'group.errorApply': { es: 'Error al enviar solicitud', en: 'Error sending application', fr: 'Erreur lors de l\'envoi de la demande', pt: 'Erro ao enviar solicitação' },
  'group.confirmDelete': { es: '¿Eliminar este grupo?', en: 'Delete this group?', fr: 'Supprimer ce groupe ?', pt: 'Excluir este grupo?' },
  'group.toastDeleted': { es: '🗑 Grupo eliminado', en: '🗑 Group deleted', fr: '🗑 Groupe supprimé', pt: '🗑 Grupo excluído' },
  'group.errorDelete': { es: 'Error al eliminar el grupo', en: 'Error deleting group', fr: 'Erreur lors de la suppression du groupe', pt: 'Erro ao excluir o grupo' },
  'group.errorNoCharacters': { es: 'No tienes personajes en este grupo', en: 'You have no characters in this group', fr: 'Vous n\'avez pas de personnages dans ce groupe', pt: 'Você não tem personagens neste grupo' },
  'group.confirmLeave': { es: '¿Estás seguro de que quieres salir del grupo?', en: 'Are you sure you want to leave the group?', fr: 'Êtes-vous sûr de vouloir quitter le groupe ?', pt: 'Tem certeza de que deseja sair do grupo?' },
  'group.toastLeft': { es: '👋 Has salido del grupo', en: '👋 You left the group', fr: '👋 Vous avez quitté le groupe', pt: '👋 Você saiu do grupo' },
  'group.errorLeave': { es: 'Error al salir del grupo', en: 'Error leaving group', fr: 'Erreur en quittant le groupe', pt: 'Erro ao sair do grupo' },
  'group.confirmKick': { es: '¿Expulsar a {name} del grupo?', en: 'Kick {name} from the group?', fr: 'Expulser {name} du groupe ?', pt: 'Expulsar {name} do grupo?' },
  'group.toastKicked': { es: '👢 {name} ha sido expulsado', en: '👢 {name} has been kicked', fr: '👢 {name} a été expulsé', pt: '👢 {name} foi expulso' },
  'group.errorKick': { es: 'Error al expulsar miembro', en: 'Error kicking member', fr: 'Erreur lors de l\'expulsion du membre', pt: 'Erro ao expulsar membro' },
  'group.confirmClose': { es: 'Eres el único miembro. ¿Cerrar el grupo?', en: 'You are the only member. Close the group?', fr: 'Vous êtes le seul membre. Fermer le groupe ?', pt: 'Você é o único membro. Fechar o grupo?' },
  'group.toastClosed': { es: 'Grupo cerrado', en: 'Group closed', fr: 'Groupe fermé', pt: 'Grupo fechado' },
  'group.errorClose': { es: 'Error al cerrar grupo', en: 'Error closing group', fr: 'Erreur en fermant le groupe', pt: 'Erro ao fechar o grupo' },
  'group.confirmLeaveLeader': { es: '¿Salir del grupo? El liderazgo se pasará a {name}.', en: 'Leave the group? Leadership will be transferred to {name}.', fr: 'Quitter le groupe ? Le leadership sera transféré à {name}.', pt: 'Sair do grupo? A liderança será transferida para {name}.' },
  'group.confirmTransfer': { es: '¿Transferir liderazgo a {name}?', en: 'Transfer leadership to {name}?', fr: 'Transférer le leadership à {name} ?', pt: 'Transferir liderança para {name}?' },
  'group.toastTransfer': { es: '👑 Liderazgo transferido a {name}', en: '👑 Leadership transferred to {name}', fr: '👑 Leadership transféré à {name}', pt: '👑 Liderança transferida para {name}' },
  'group.errorTransfer': { es: 'Error al transferir liderazgo', en: 'Error transferring leadership', fr: 'Erreur lors du transfert de leadership', pt: 'Erro ao transferir liderança' },
  'group.dropsHide': { es: 'Ocultar drops activados', en: 'Hide active drops', fr: 'Masquer les drops actifs', pt: 'Ocultar drops ativos' },
  'group.dropsShow': { es: 'Drops activados', en: 'Active drops', fr: 'Drops actifs', pt: 'Drops ativos' },
  'group.bossDrops': { es: 'Drops del jefe', en: 'Boss drops', fr: 'Drops du boss', pt: 'Drops do chefe' },
  'group.noDrops': { es: 'Sin drops registrados para este jefe.', en: 'No drops registered for this boss.', fr: 'Aucun drop enregistré pour ce boss.', pt: 'Nenhum drop registrado para este chefe.' },
  'group.membersTitle': { es: 'Miembros ({count}/{max})', en: 'Members ({count}/{max})', fr: 'Membres ({count}/{max})', pt: 'Membros ({count}/{max})' },
  'group.openChat': { es: 'Abrir chat del grupo', en: 'Open group chat', fr: 'Ouvrir le chat du groupe', pt: 'Abrir chat do grupo' },
  'group.chatLocked': { es: 'El chat está disponible solo para miembros del grupo.', en: 'Chat is available only for group members.', fr: 'Le chat est disponible uniquement pour les membres du groupe.', pt: 'O chat está disponível apenas para membros do grupo.' },
  'group.selectCharacter': { es: 'Selecciona tu personaje', en: 'Select your character', fr: 'Sélectionnez votre personnage', pt: 'Selecione seu personagem' },
  'group.selectCharacterPlaceholder': { es: 'Elige un personaje', en: 'Choose a character', fr: 'Choisissez un personnage', pt: 'Escolha um personagem' },
  'group.deleting': { es: 'Eliminando...', en: 'Deleting...', fr: 'Suppression...', pt: 'Excluindo...' },
  'group.delete': { es: '🗑 Eliminar grupo', en: '🗑 Delete group', fr: '🗑 Supprimer le groupe', pt: '🗑 Excluir grupo' },
  'group.transfer': { es: '⭐ Transferir liderazgo', en: '⭐ Transfer leadership', fr: '⭐ Transférer le leadership', pt: '⭐ Transferir liderança' },
  'group.leaveAndTransfer': { es: 'Salir y pasar liderazgo', en: 'Leave and transfer leadership', fr: 'Quitter et transférer le leadership', pt: 'Sair e transferir liderança' },
  'group.errorLoadData': { es: 'Error al cargar datos', en: 'Error loading data', fr: 'Erreur de chargement des données', pt: 'Erro ao carregar dados' },
  'group.errorCreate': { es: 'Error al crear grupo', en: 'Error creating group', fr: 'Erreur lors de la création du groupe', pt: 'Erro ao criar grupo' },
  'group.character': { es: 'Personaje', en: 'Character', fr: 'Personnage', pt: 'Personagem' },
  'group.languages': { es: 'Idiomas del grupo', en: 'Group languages', fr: 'Langues du groupe', pt: 'Idiomas do grupo' },
  'group.titleOptional': { es: 'Título', en: 'Title', fr: 'Titre', pt: 'Título' },
  'group.titlePlaceholder': { es: 'Ej: Grupo relajado', en: 'e.g., Chill group', fr: 'Ex. : Groupe tranquille', pt: 'Ex.: Grupo tranquilo' },
  'group.stelesCount': { es: 'Cuántas Estelas', en: 'How many Steles', fr: 'Combien de Stèles', pt: 'Quantas Estátuas' },
  'group.creating': { es: 'Creando...', en: 'Creating...', fr: 'Création...', pt: 'Criando...' },
  'profile.loginRequired': { es: 'Debes iniciar sesion para ver tu perfil.', en: 'You need to sign in to view your profile.', fr: 'Vous devez vous connecter pour voir votre profil.', pt: 'Voce precisa iniciar sessao para ver seu perfil.' },
  'profile.loginDiscord': { es: 'Iniciar sesion con Discord', en: 'Sign in with Discord', fr: 'Se connecter avec Discord', pt: 'Entrar com Discord' },
  'profile.heroEyebrow': { es: 'Panel de perfil', en: 'Profile panel', fr: 'Panneau de profil', pt: 'Painel de perfil' },
  'profile.heroDescription': { es: 'Un espacio mas claro para gestionar personajes, solicitudes, grupos creados y publicaciones de la comunidad.', en: 'A clearer space to manage characters, applications, created groups, and community posts.', fr: 'Un espace plus clair pour gerer les personnages, demandes, groupes crees et publications de la communaute.', pt: 'Um espaco mais claro para gerenciar personagens, solicitacoes, grupos criados e publicacoes da comunidade.' },
  'profile.tagDiscord': { es: 'Discord conectado', en: 'Discord connected', fr: 'Discord connecte', pt: 'Discord conectado' },
  'profile.tagModes': { es: 'PvE y PvP', en: 'PvE and PvP', fr: 'PvE et PvP', pt: 'PvE e PvP' },
  'profile.tagAccount': { es: 'Cuenta WakGroup', en: 'WakGroup account', fr: 'Compte WakGroup', pt: 'Conta WakGroup' },
  'profile.activeSection': { es: 'Seccion activa', en: 'Active section', fr: 'Section active', pt: 'Secao ativa' },
  'profile.accountStatus': { es: 'Estado de cuenta', en: 'Account status', fr: 'Etat du compte', pt: 'Estado da conta' },
  'profile.readyToPlay': { es: 'Lista para jugar', en: 'Ready to play', fr: 'Pret a jouer', pt: 'Pronta para jogar' },
  'profile.accountNote': { es: 'Tu progreso y actividad quedan reunidos en una sola interfaz.', en: 'Your progress and activity are gathered in a single interface.', fr: 'Votre progression et votre activite sont reunies dans une seule interface.', pt: 'Seu progresso e sua atividade ficam reunidos em uma unica interface.' },
  'profile.centerTitle': { es: 'Centro de aventura', en: 'Adventure hub', fr: 'Centre d aventure', pt: 'Centro de aventura' },
  'profile.centerSubtitle': { es: 'Selecciona la vista que quieres revisar o administrar.', en: 'Select the view you want to review or manage.', fr: 'Selectionnez la vue que vous voulez consulter ou gerer.', pt: 'Selecione a visualizacao que deseja revisar ou administrar.' },
  'profile.sectionsCount': { es: '{count} secciones', en: '{count} sections', fr: '{count} sections', pt: '{count} secoes' },
  'profile.badge': { es: 'Perfil WakGroup', en: 'WakGroup profile', fr: 'Profil WakGroup', pt: 'Perfil WakGroup' },
  'profile.tabCharsEyebrow': { es: 'Builds y roles', en: 'Builds and roles', fr: 'Builds et roles', pt: 'Builds e papeis' },
  'profile.tabSent': { es: 'Solicitudes enviadas', en: 'Sent applications', fr: 'Demandes envoyees', pt: 'Solicitacoes enviadas' },
  'profile.tabSentEyebrow': { es: 'Tu actividad', en: 'Your activity', fr: 'Votre activite', pt: 'Sua atividade' },
  'profile.tabIncoming': { es: 'Solicitudes recibidas', en: 'Received applications', fr: 'Demandes recues', pt: 'Solicitacoes recebidas' },
  'profile.tabIncomingEyebrow': { es: 'Gestion del lider', en: 'Leader management', fr: 'Gestion du chef', pt: 'Gestao do lider' },
  'profile.tabGroups': { es: 'Grupos creados', en: 'Created groups', fr: 'Groupes crees', pt: 'Grupos criados' },
  'profile.tabGroupsEyebrow': { es: 'Historial activo', en: 'Active history', fr: 'Historique actif', pt: 'Historico ativo' },
  'profile.tabWikiEyebrow': { es: 'Guias publicadas', en: 'Published guides', fr: 'Guides publies', pt: 'Guias publicadas' },
  'profile.charactersTitle': { es: 'Mis personajes', en: 'My characters', fr: 'Mes personnages', pt: 'Meus personagens' },
  'profile.newCharacter': { es: 'Nuevo personaje', en: 'New character', fr: 'Nouveau personnage', pt: 'Novo personagem' },
  'profile.editCharacter': { es: 'Editar personaje', en: 'Edit character', fr: 'Modifier le personnage', pt: 'Editar personagem' },
  'profile.nameLabel': { es: 'Nombre *', en: 'Name *', fr: 'Nom *', pt: 'Nome *' },
  'profile.namePlaceholder': { es: 'Nombre del personaje', en: 'Character name', fr: 'Nom du personnage', pt: 'Nome do personagem' },
  'profile.levelLabel': { es: 'Nivel *', en: 'Level *', fr: 'Niveau *', pt: 'Nivel *' },
  'profile.classLabel': { es: 'Clase *', en: 'Class *', fr: 'Classe *', pt: 'Classe *' },
  'profile.roleLabel': { es: 'Rol *', en: 'Role *', fr: 'Role *', pt: 'Papel *' },
  'profile.serverLabel': { es: 'Servidor *', en: 'Server *', fr: 'Serveur *', pt: 'Servidor *' },
  'profile.saveCharacter': { es: 'Guardar personaje', en: 'Save character', fr: 'Enregistrer le personnage', pt: 'Salvar personagem' },
  'profile.updateCharacter': { es: 'Actualizar personaje', en: 'Update character', fr: 'Mettre a jour le personnage', pt: 'Atualizar personagem' },
  'profile.emptyCharactersTitle': { es: 'Sin personajes', en: 'No characters', fr: 'Aucun personnage', pt: 'Sem personagens' },
  'profile.emptyCharactersBody': { es: 'Anade tu primer personaje para unirte a grupos.', en: 'Add your first character to join groups.', fr: 'Ajoutez votre premier personnage pour rejoindre des groupes.', pt: 'Adicione seu primeiro personagem para entrar em grupos.' },
  'profile.characterAdded': { es: 'Personaje anadido', en: 'Character added', fr: 'Personnage ajoute', pt: 'Personagem adicionado' },
  'profile.characterUpdated': { es: 'Personaje actualizado', en: 'Character updated', fr: 'Personnage mis a jour', pt: 'Personagem atualizado' },
  'profile.characterDeleted': { es: 'Personaje eliminado', en: 'Character deleted', fr: 'Personnage supprime', pt: 'Personagem excluido' },
  'profile.deleteCharacterConfirm': { es: 'Eliminar personaje?', en: 'Delete character?', fr: 'Supprimer le personnage ?', pt: 'Excluir personagem?' },
  'profile.sentEmptyTitle': { es: 'Sin solicitudes', en: 'No applications', fr: 'Aucune demande', pt: 'Sem solicitacoes' },
  'profile.sentEmptyBody': { es: 'Aun no has aplicado a ningun grupo.', en: 'You have not applied to any group yet.', fr: 'Vous n avez encore postule a aucun groupe.', pt: 'Voce ainda nao se candidatou a nenhum grupo.' },
  'profile.pending': { es: 'Pendiente', en: 'Pending', fr: 'En attente', pt: 'Pendente' },
  'profile.accepted': { es: 'Aceptado', en: 'Accepted', fr: 'Accepte', pt: 'Aceito' },
  'profile.rejected': { es: 'Rechazado', en: 'Rejected', fr: 'Refuse', pt: 'Rejeitado' },
  'profile.incomingEmptyTitle': { es: 'Sin solicitudes', en: 'No applications', fr: 'Aucune demande', pt: 'Sem solicitacoes' },
  'profile.incomingEmptyBody': { es: 'No tienes solicitudes pendientes en tus grupos.', en: 'You do not have pending applications in your groups.', fr: 'Vous n avez pas de demandes en attente dans vos groupes.', pt: 'Voce nao tem solicitacoes pendentes nos seus grupos.' },
  'profile.applicationAccepted': { es: 'Solicitud aceptada', en: 'Application accepted', fr: 'Demande acceptee', pt: 'Solicitacao aceita' },
  'profile.applicationRejected': { es: 'Solicitud rechazada', en: 'Application rejected', fr: 'Demande refusee', pt: 'Solicitacao rejeitada' },
  'profile.dungeonGroupsTitle': { es: 'Mazmorra', en: 'Dungeon', fr: 'Donjon', pt: 'Masmorra' },
  'profile.emptyDungeonGroupsTitle': { es: 'Sin grupos de mazmorra', en: 'No dungeon groups', fr: 'Aucun groupe de donjon', pt: 'Sem grupos de masmorra' },
  'profile.emptyDungeonGroupsBody': { es: 'No has creado grupos de mazmorra.', en: 'You have not created dungeon groups.', fr: 'Vous n avez pas cree de groupes de donjon.', pt: 'Voce nao criou grupos de masmorra.' },
  'profile.deleteDungeonGroupConfirm': { es: 'Eliminar este grupo de mazmorra?', en: 'Delete this dungeon group?', fr: 'Supprimer ce groupe de donjon ?', pt: 'Excluir este grupo de masmorra?' },
  'profile.groupDeleted': { es: 'Grupo eliminado', en: 'Group deleted', fr: 'Groupe supprime', pt: 'Grupo excluido' },
  'profile.pvpGroupsTitle': { es: 'PVP', en: 'PVP', fr: 'PVP', pt: 'PVP' },
  'profile.emptyPvpGroupsTitle': { es: 'Sin grupos PVP', en: 'No PVP groups', fr: 'Aucun groupe PVP', pt: 'Sem grupos PVP' },
  'profile.emptyPvpGroupsBody': { es: 'No has creado enfrentamientos PVP.', en: 'You have not created PVP matches.', fr: 'Vous n avez pas cree de matchs PVP.', pt: 'Voce nao criou confrontos PVP.' },
  'profile.deletePvpGroupConfirm': { es: 'Eliminar este grupo PVP?', en: 'Delete this PVP group?', fr: 'Supprimer ce groupe PVP ?', pt: 'Excluir este grupo PVP?' },
  'profile.pvpDeleted': { es: 'Enfrentamiento eliminado', en: 'Match deleted', fr: 'Match supprime', pt: 'Confronto excluido' },
  'profile.emptyPostsTitle': { es: 'Sin posts', en: 'No posts', fr: 'Aucune publication', pt: 'Sem posts' },
  'profile.emptyPostsBody': { es: 'Aun no has creado ninguna guia.', en: 'You have not created any guides yet.', fr: 'Vous n avez encore cree aucun guide.', pt: 'Voce ainda nao criou nenhum guia.' },
  'profile.deleteGuideConfirm': { es: 'Eliminar esta guia?', en: 'Delete this guide?', fr: 'Supprimer ce guide ?', pt: 'Excluir este guia?' },
  'profile.guideDeleted': { es: 'Guia eliminada', en: 'Guide deleted', fr: 'Guide supprime', pt: 'Guia excluido' },
  'footer.owner': { es: 'Hecho por Clarex', en: 'Made by Clarex', fr: 'Cree par Clarex', pt: 'Feito por Clarex' },
};

export function t(key: TranslationKey, language: Language): string {
  return translations[key]?.[language] || translations[key]?.es || key;
}

export function getItemTitle(item: any, language: Language): string {
  if (!item) return '';
  return item.title?.[language] || item.title?.es || item.title?.en || '';
}

export function getItemDescription(item: any, language: Language): string {
  if (!item) return '';
  return item.description?.[language] || item.description?.es || item.description?.en || '';
}

export function getMobName(mob: any, language: Language): string {
  if (!mob) return '';
  return mob.nombre?.[language] || mob.nombre?.es || mob.nombre?.en || '';
}

export function getDungeonName(dungeon: any, language: Language): string {
  if (!dungeon) return '';
  return dungeon.name?.[language] || dungeon.name?.es || dungeon.name?.en || '';
}

export function getDungeonApiName(dungeon: any, language: Language): string {
  if (!dungeon) return '';
  const byLang = dungeon?.[`name_${language}`] || dungeon?.name?.[language];
  return (
    byLang ||
    dungeon?.name_es ||
    dungeon?.name_en ||
    dungeon?.name_fr ||
    dungeon?.name_pt ||
    dungeon?.name ||
    ''
  );
}
