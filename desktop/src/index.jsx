import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { io } from 'socket.io-client';

import wakfuMobs from '../wakfu_mobs.json';
import itemsData from '../items.json';
import mazmosData from '../mazmos.json';

const API_URL_FALLBACK = 'https://wakgroup.onrender.com';

const LANGUAGES = {
    es: { label: 'Español', flag: '🇪🇸' },
    en: { label: 'English', flag: '🇬🇧' },
    fr: { label: 'Français', flag: '🇫🇷' },
    pt: { label: 'Português', flag: '🇧🇷' },
};

const TRANSLATIONS = {
    'common.open': { es: 'Abierto', en: 'Open', fr: 'Ouvert', pt: 'Aberto' },
    'common.closed': { es: 'Cerrado', en: 'Closed', fr: 'Fermé', pt: 'Fechado' },
    'common.loading': { es: 'Cargando...', en: 'Loading...', fr: 'Chargement...', pt: 'Carregando...' },
    'common.error': { es: 'Error', en: 'Error', fr: 'Erreur', pt: 'Erro' },
    'common.save': { es: 'Guardar', en: 'Save', fr: 'Enregistrer', pt: 'Salvar' },
    'common.cancel': { es: 'Cancelar', en: 'Cancel', fr: 'Annuler', pt: 'Cancelar' },
    'common.yes': { es: 'Sí', en: 'Yes', fr: 'Oui', pt: 'Sim' },
    'common.no': { es: 'No', en: 'No', fr: 'Non', pt: 'Não' },
    'group.leave': { es: 'Salir del grupo', en: 'Leave group', fr: 'Quitter le groupe', pt: 'Sair do grupo' },
    'group.kick': { es: 'Expulsar', en: 'Kick', fr: 'Expulser', pt: 'Expulsar' },
    'group.delete': { es: 'Eliminar grupo', en: 'Delete group', fr: 'Supprimer le groupe', pt: 'Excluir grupo' },
    'group.transfer': { es: 'Transferir liderazgo', en: 'Transfer leadership', fr: 'Transférer le leadership', pt: 'Transferir liderança' },
    'group.leaveAsLeader': { es: 'Salir y pasar liderazgo', en: 'Leave and transfer leadership', fr: 'Quitter et transférer', pt: 'Sair e transferir' },
    'group.noGroups': { es: 'No hay grupos', en: 'No groups', fr: 'Aucun groupe', pt: 'Nenhum grupo' },
    'group.search': { es: 'Buscar grupos...', en: 'Search groups...', fr: 'Rechercher...', pt: 'Buscar grupos...' },
    'group.create': { es: 'Crear Grupo', en: 'Create Group', fr: 'Créer un groupe', pt: 'Criar Grupo' },
    'group.join': { es: 'Unirse', en: 'Join', fr: 'Rejoindre', pt: 'Entrar' },
    'group.apply': { es: 'Solicitar', en: 'Apply', fr: 'Postuler', pt: 'Candidatar' },
    'group.title': { es: 'Título', en: 'Title', fr: 'Titre', pt: 'Título' },
    'group.titleOptional': { es: 'Título (opcional)', en: 'Title (optional)', fr: 'Titre (optionnel)', pt: 'Título (opcional)' },
    'group.stelesActiveLabel': { es: 'Estela activada', en: 'Steles active', fr: 'Stèles actives', pt: 'Estátuas ativas' },
    'group.stelesCountLabel': { es: 'Cuántas Estelas', en: 'How many Steles', fr: 'Combien de Stèles', pt: 'Quantas Estátuas' },
    'group.interventionActiveLabel': { es: 'Intervención activada', en: 'Intervention active', fr: 'Intervention active', pt: 'Intervenção ativa' },
    'group.leader': { es: 'Líder', en: 'Leader', fr: 'Chef', pt: 'Líder' },
    'group.members': { es: 'Miembros', en: 'Members', fr: 'Membres', pt: 'Membros' },
    'group.dungeon': { es: 'Mazmorra', en: 'Dungeon', fr: 'Donjon', pt: 'Masmorra' },
    'group.selectChar': { es: 'Selecciona personaje', en: 'Select character', fr: 'Sélectionner', pt: 'Selecionar' },
    'pvp.mode': { es: 'Modo', en: 'Mode', fr: 'Mode', pt: 'Modo' },
    'pvp.title': { es: 'Enfrentamiento PVP', en: 'PVP Match', fr: 'Match PVP', pt: 'Confronto PVP' },
    'pvp.redTeam': { es: 'Equipo Rojo', en: 'Red Team', fr: 'Équipe Rouge', pt: 'Equipe Vermelha' },
    'pvp.blueTeam': { es: 'Equipo Azul', en: 'Blue Team', fr: 'Équipe Bleue', pt: 'Equipe Azul' },
    'pvp.leave': { es: 'Salir', en: 'Leave', fr: 'Quitter', pt: 'Sair' },
    'chat.open': { es: 'Abrir chat', en: 'Open chat', fr: 'Ouvrir le chat', pt: 'Abrir chat' },
    'drops.title': { es: 'Seleccionar Drops', en: 'Select Drops', fr: 'Sélectionner Drops', pt: 'Selecionar Drops' },
    'drops.selectAll': { es: 'Seleccionar todos', en: 'Select all', fr: 'Tout sélectionner', pt: 'Selecionar todos' },
    'drops.clearAll': { es: 'Limpiar todos', en: 'Clear all', fr: 'Tout désélectionner', pt: 'Limpar todos' },
    'common.server': { es: 'Servidor', en: 'Server', fr: 'Serveur', pt: 'Servidor' },
    'common.status': { es: 'Estado', en: 'Status', fr: 'Statut', pt: 'Status' },
    'common.level': { es: 'Nivel', en: 'Level', fr: 'Niveau', pt: 'Nível' },
    'common.levelShort': { es: 'Nv.', en: 'Lv.', fr: 'Nv.', pt: 'Nv.' },
    'common.stasis': { es: 'Stasis', en: 'Stasis', fr: 'Stase', pt: 'Stasis' },
    'common.steles': { es: 'Estelas', en: 'Steles', fr: 'Stèles', pt: 'Estátuas' },
    'common.intervention': { es: 'Intervención', en: 'Intervention', fr: 'Intervention', pt: 'Intervenção' },
    'common.players': { es: 'Jugadores', en: 'Players', fr: 'Joueurs', pt: 'Jogadores' },
    'common.membersCount': { es: 'Miembros', en: 'Members', fr: 'Membres', pt: 'Membros' },
    'common.free': { es: 'Libre', en: 'Free', fr: 'Libre', pt: 'Livre' },
    'common.close': { es: 'Cerrar', en: 'Close', fr: 'Fermer', pt: 'Fechar' },
    'common.confirm': { es: 'Confirmar', en: 'Confirm', fr: 'Confirmer', pt: 'Confirmar' },
    'common.invalidGroupId': { es: 'ID de grupo no válido', en: 'Invalid group ID', fr: 'ID de groupe invalide', pt: 'ID de grupo inválido' },
    'overlay.notifications': { es: 'Notificaciones', en: 'Notifications', fr: 'Notifications', pt: 'Notificações' },
    'overlay.noNotifications': { es: 'Sin notificaciones', en: 'No notifications', fr: 'Aucune notification', pt: 'Sem notificações' },
    'overlay.refresh': { es: 'Actualizar', en: 'Refresh', fr: 'Actualiser', pt: 'Atualizar' },
    'overlay.activeGroups': { es: 'Grupos activos', en: 'Active groups', fr: 'Groupes actifs', pt: 'Grupos ativos' },
    'overlay.activePvp': { es: 'Enfrentamientos PVP', en: 'PVP matches', fr: 'Matchs PVP', pt: 'Confrontos PVP' },
    'overlay.noActiveGroups': { es: 'No hay grupos activos.', en: 'No active groups.', fr: 'Aucun groupe actif.', pt: 'Nenhum grupo ativo.' },
    'overlay.noActivePvp': { es: 'No hay enfrentamientos activos.', en: 'No active matches.', fr: 'Aucun match actif.', pt: 'Nenhum confronto ativo.' },
    'overlay.createGroup': { es: 'Crear Grupo', en: 'Create Group', fr: 'Créer un groupe', pt: 'Criar Grupo' },
    'overlay.createPvp': { es: 'Crear Enfrentamiento', en: 'Create Match', fr: 'Créer un match', pt: 'Criar Confronto' },
    'overlay.logout': { es: 'Salir', en: 'Logout', fr: 'Déconnexion', pt: 'Sair' },
    'overlay.clickThroughOn': {
        es: 'Click-Through activado (Ctrl+Alt+W)',
        en: 'Click-through enabled (Ctrl+Alt+W)',
        fr: 'Click-through activé (Ctrl+Alt+W)',
        pt: 'Click-through ativado (Ctrl+Alt+W)',
    },
    'overlay.clickThroughOff': {
        es: 'Click-Through desactivado (Ctrl+Alt+W)',
        en: 'Click-through disabled (Ctrl+Alt+W)',
        fr: 'Click-through désactivé (Ctrl+Alt+W)',
        pt: 'Click-through desativado (Ctrl+Alt+W)',
    },
    'overlay.errorLoadGroups': { es: 'No se pudieron cargar los grupos.', en: 'Could not load groups.', fr: 'Impossible de charger les groupes.', pt: 'Não foi possível carregar os grupos.' },
    'overlay.errorLoadPvp': { es: 'No se pudieron cargar los enfrentamientos.', en: 'Could not load matches.', fr: 'Impossible de charger les matchs.', pt: 'Não foi possível carregar os confrontos.' },
    'overlay.error': { es: 'Error', en: 'Error', fr: 'Erreur', pt: 'Erro' },
    'notif.newApplication': { es: 'Nueva solicitud', en: 'New application', fr: 'Nouvelle demande', pt: 'Nova candidatura' },
    'notif.applicationAccepted': { es: 'Solicitud aceptada', en: 'Application accepted', fr: 'Demande acceptée', pt: 'Candidatura aceita' },
    'notif.applicationRejected': { es: 'Solicitud rechazada', en: 'Application rejected', fr: 'Demande refusée', pt: 'Candidatura rejeitada' },
    'notif.message': { es: 'Mensaje', en: 'Message', fr: 'Message', pt: 'Mensagem' },
    'group.detailTitle': { es: 'Detalle del grupo', en: 'Group details', fr: 'Détails du groupe', pt: 'Detalhes do grupo' },
    'group.notFound': { es: 'Grupo no encontrado', en: 'Group not found', fr: 'Groupe introuvable', pt: 'Grupo não encontrado' },
    'group.dropsActive': { es: 'Drops activados', en: 'Active drops', fr: 'Drops actifs', pt: 'Drops ativos' },
    'group.dropsHide': { es: 'Ocultar drops', en: 'Hide drops', fr: 'Masquer les drops', pt: 'Ocultar drops' },
    'group.dropsNone': { es: 'Sin drops registrados para este jefe', en: 'No drops recorded for this boss', fr: 'Aucun drop enregistré pour ce boss', pt: 'Nenhum drop registrado para este chefe' },
    'group.membersTitle': { es: 'Miembros ({count}/6)', en: 'Members ({count}/6)', fr: 'Membres ({count}/6)', pt: 'Membros ({count}/6)' },
    'group.applySent': { es: '¡Solicitud enviada!', en: 'Application sent!', fr: 'Demande envoyée !', pt: 'Candidatura enviada!' },
    'group.errorLoad': { es: 'Error al cargar grupo', en: 'Error loading group', fr: 'Erreur de chargement du groupe', pt: 'Erro ao carregar grupo' },
    'group.errorApply': { es: 'Error al enviar solicitud', en: 'Error sending application', fr: 'Erreur lors de l\'envoi de la demande', pt: 'Erro ao enviar solicitação' },
    'group.confirmDelete': { es: '¿Estás seguro de que quieres eliminar este grupo?', en: 'Are you sure you want to delete this group?', fr: 'Êtes-vous sûr de vouloir supprimer ce groupe ?', pt: 'Tem certeza de que deseja excluir este grupo?' },
    'group.errorDelete': { es: 'Error al eliminar grupo', en: 'Error deleting group', fr: 'Erreur lors de la suppression du groupe', pt: 'Erro ao excluir o grupo' },
    'group.errorNoCharacters': { es: 'No tienes personajes en este grupo', en: 'You have no characters in this group', fr: 'Vous n\'avez pas de personnages dans ce groupe', pt: 'Você não tem personagens neste grupo' },
    'group.confirmLeave': { es: '¿Estás seguro de que quieres salir del grupo?', en: 'Are you sure you want to leave the group?', fr: 'Êtes-vous sûr de vouloir quitter le groupe ?', pt: 'Tem certeza de que deseja sair do grupo?' },
    'group.errorLeave': { es: 'Error al salir del grupo', en: 'Error leaving group', fr: 'Erreur en quittant le groupe', pt: 'Erro ao sair do grupo' },
    'group.confirmKick': { es: '¿Expulsar a {name} del grupo?', en: 'Kick {name} from the group?', fr: 'Expulser {name} du groupe ?', pt: 'Expulsar {name} do grupo?' },
    'group.errorKick': { es: 'Error al expulsar miembro', en: 'Error kicking member', fr: 'Erreur lors de l\'expulsion du membre', pt: 'Erro ao expulsar membro' },
    'group.confirmClose': { es: 'Eres el único miembro. ¿Cerrar el grupo?', en: 'You are the only member. Close the group?', fr: 'Vous êtes le seul membre. Fermer le groupe ?', pt: 'Você é o único membro. Fechar o grupo?' },
    'group.errorClose': { es: 'Error al cerrar grupo', en: 'Error closing group', fr: 'Erreur en fermant le groupe', pt: 'Erro ao fechar o grupo' },
    'group.confirmLeaveLeader': { es: '¿Salir del grupo? El liderazgo se pasará a {name}.', en: 'Leave the group? Leadership will be transferred to {name}.', fr: 'Quitter le groupe ? Le leadership sera transféré à {name}.', pt: 'Sair do grupo? A liderança será transferida para {name}.' },
    'group.confirmTransfer': { es: '¿Transferir liderazgo a {name}?', en: 'Transfer leadership to {name}?', fr: 'Transférer le leadership à {name} ?', pt: 'Transferir liderança para {name}?' },
    'group.errorTransfer': { es: 'Error al transferir liderazgo', en: 'Error transferring leadership', fr: 'Erreur lors du transfert de leadership', pt: 'Erro ao transferir liderança' },
    'chat.title': { es: 'Chat del grupo', en: 'Group chat', fr: 'Chat du groupe', pt: 'Chat do grupo' },
    'chat.onlyMembers': { es: 'El chat es solo para miembros', en: 'Chat is only for members', fr: 'Le chat est réservé aux membres', pt: 'O chat é apenas para membros' },
    'chat.loadingMessages': { es: 'Cargando mensajes...', en: 'Loading messages...', fr: 'Chargement des messages...', pt: 'Carregando mensagens...' },
    'chat.noMessages': { es: 'No hay mensajes aún.', en: 'No messages yet.', fr: 'Pas encore de messages.', pt: 'Ainda não há mensagens.' },
    'chat.placeholder': { es: 'Escribe un mensaje...', en: 'Type a message...', fr: 'Écrire un message...', pt: 'Digite uma mensagem...' },
    'chat.connectError': { es: 'No se pudo conectar al chat', en: 'Could not connect to chat', fr: 'Impossible de se connecter au chat', pt: 'Não foi possível conectar ao chat' },
    'pvp.notFound': { es: 'No encontrado', en: 'Not found', fr: 'Introuvable', pt: 'Não encontrado' },
    'pvp.createTitle': { es: 'Crear Enfrentamiento', en: 'Create Match', fr: 'Créer un match', pt: 'Criar Confronto' },
    'pvp.creating': { es: 'Creando...', en: 'Creating...', fr: 'Création...', pt: 'Criando...' },
    'pvp.create': { es: 'Crear', en: 'Create', fr: 'Créer', pt: 'Criar' },
    'pvp.errorCreate': { es: 'Error al crear', en: 'Error creating', fr: 'Erreur de création', pt: 'Erro ao criar' },
    'pvp.equipmentBandLabel': { es: 'Franja de equipo', en: 'Equipment band', fr: 'Tranche d\'équipement', pt: 'Faixa de equipamento' },
    'pvp.titlePlaceholder': { es: 'Ej: Busco rival...', en: 'e.g., Looking for rival...', fr: 'Ex. : Cherche rival...', pt: 'Ex.: Procurando rival...' },
    'pvp.created': { es: '✓ ¡Enfrentamiento creado!', en: '✓ Match created!', fr: '✓ Match créé !', pt: '✓ Confronto criado!' },
    'pve.createTitle': { es: 'Crear Grupo', en: 'Create Group', fr: 'Créer un groupe', pt: 'Criar Grupo' },
    'pve.created': { es: '✓ ¡Grupo creado!', en: '✓ Group created!', fr: '✓ Groupe créé !', pt: '✓ Grupo criado!' },
    'pve.errorLogin': { es: 'Necesitas iniciar sesión primero', en: 'You need to log in first', fr: 'Vous devez d\'abord vous connecter', pt: 'Você precisa entrar primeiro' },
    'pve.searchPlaceholder': { es: 'Buscar...', en: 'Search...', fr: 'Rechercher...', pt: 'Buscar...' },
    'pve.titlePlaceholder': { es: 'Ej: Grupo relajado', en: 'e.g., Chill group', fr: 'Ex. : Groupe tranquille', pt: 'Ex.: Grupo tranquilo' },
    'pve.dropsCount': { es: 'Drops ({count})', en: 'Drops ({count})', fr: 'Drops ({count})', pt: 'Drops ({count})' },
    'group.errorCreate': { es: 'Error al crear grupo', en: 'Error creating group', fr: 'Erreur lors de la création du groupe', pt: 'Erro ao criar grupo' },
    'drops.loading': { es: 'Cargando drops...', en: 'Loading drops...', fr: 'Chargement des drops...', pt: 'Carregando drops...' },
    'drops.none': { es: 'No hay drops registrados para este jefe', en: 'No drops recorded for this boss', fr: 'Aucun drop enregistré pour ce boss', pt: 'Nenhum drop registrado para este chefe' },
    'drops.confirm': { es: 'Confirmar ({count} seleccionados)', en: 'Confirm ({count} selected)', fr: 'Confirmer ({count} sélectionnés)', pt: 'Confirmar ({count} selecionados)' },
};

const mazmosById = new Map();
mazmosData.forEach((m) => {
    if (m?.id !== undefined && m?.id !== null) {
        mazmosById.set(Number(m.id), m);
    }
});

function getTranslation(key, lang = 'es') {
    return TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.es || key;
}

function getItemTitle(item, lang = 'es') {
    if (!item) return '';
    return item.title?.[lang] || item.title?.es || item.title?.en || '';
}

function getMobName(mob, lang = 'es') {
    if (!mob) return '';
    return mob.nombre?.[lang] || mob.nombre?.es || mob.nombre?.en || '';
}

function getDungeonName(dungeon, lang = 'es') {
    if (!dungeon) return '';
    return dungeon.name?.[lang] || dungeon.name?.es || dungeon.name?.en || '';
}

function getLanguage() {
    if (typeof window === 'undefined') return 'es';
    return localStorage.getItem('wakgroup_language') || 'es';
}

function setLanguage(lang) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('wakgroup_language', lang);
    }
}

function getViewFromHash() {
    const h = (typeof window !== 'undefined' && window.location.hash) ? window.location.hash.slice(1) : '';
    
    // Handle login callback
    if (h.startsWith('login-callback?')) {
        const params = new URLSearchParams(h.split('?')[1]);
        const token = params.get('token');
        if (token) {
            localStorage.setItem('session_token', token);
            window.location.hash = '';
        }
    }
    
    if (h.startsWith('create-pvp')) return { view: 'create-pvp' };
    if (h.startsWith('create-pve')) return { view: 'create-pve' };
    if (h.startsWith('drops/')) {
        const params = h.slice(6).split('?');
        return { view: 'drops', dungeonId: params[0], selectedDrops: params[1] ? params[1].split(',').filter(x => x).map(x => parseInt(x, 10)).filter(x => !isNaN(x)) : [] };
    }
    if (h.startsWith('pvp/')) return { view: 'pvp', groupId: h.slice(4).replace(/\?.*$/, '') };
    if (h.startsWith('group/')) return { view: 'group', groupId: h.slice(6).replace(/\?.*$/, '') };
    if (h.startsWith('chat/')) return { view: 'chat', groupId: h.slice(5).replace(/\?.*$/, '') };
    return { view: 'main' };
}

function WindowChrome({ title, subtitle, clickThrough, opacity, onOpacityChange, onToggleClickThrough }) {
    const handleClose = () => window.electronAPI?.closeCurrentWindow?.();
    const handleMinimize = () => window.electronAPI?.minimizeCurrentWindow?.();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            margin: '-12px -12px 12px -12px',
            borderBottom: `1px solid ${COLORS.borderLight}`,
            borderRadius: '16px 16px 0 0',
            WebkitAppRegion: 'drag',
            cursor: 'move',
        }}>
            <div>
                <span style={{ fontSize: 13, fontWeight: 'bold' }}>{title}</span>
                {subtitle && <span style={{ fontSize: 10, color: COLORS.titleMuted, marginLeft: 6 }}>{subtitle}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' }}>
                <button
                    onClick={onToggleClickThrough}
                    style={{
                        padding: '4px 8px',
                        fontSize: 10,
                        borderRadius: 4,
                        border: 'none',
                        background: clickThrough ? COLORS.error : COLORS.success,
                        color: COLORS.lightText,
                        cursor: 'pointer',
                    }}
                >
                    {clickThrough ? '🔒' : '🔓'}
                </button>
                <button
                    onClick={() => onOpacityChange?.(Math.min(1, opacity + 0.1))}
                    style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.buttonMutedStrong, color: COLORS.lightText, cursor: 'pointer' }}
                >+</button>
                <button
                    onClick={() => onOpacityChange?.(Math.max(0.3, opacity - 0.1))}
                    style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.buttonMutedStrong, color: COLORS.lightText, cursor: 'pointer' }}
                >-</button>
                <button onClick={handleMinimize} style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.warning, color: COLORS.lightText, cursor: 'pointer' }}>─</button>
                <button onClick={handleClose} style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.error, color: COLORS.lightText, cursor: 'pointer' }}>✕</button>
            </div>
        </div>
    );
}

const btnStyle = (bg) => ({
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 4,
    border: 'none',
    background: bg,
    color: COLORS.lightText,
    cursor: 'pointer',
});

const COLORS = {
    primary: '#d4a574',
    primaryDark: '#8b6914',
    background: '#1a1410',
    backgroundLight: '#242019',
    secondary: '#2c2416',
    surfaceElevated: 'rgba(26,20,16,0.96)',
    surfaceInset: 'rgba(44,36,22,0.72)',
    card: 'rgba(36,32,25,0.92)',
    textPrimary: '#f5f5f5',
    textSecondary: '#b0b0b0',
    titleMuted: '#8f867a',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    darkText: '#1a1410',
    lightText: '#f5f5f5',
    border: 'rgba(74,64,53,0.85)',
    borderLight: 'rgba(74,64,53,0.45)',
    buttonMuted: 'rgba(74,64,53,0.55)',
    buttonMutedStrong: 'rgba(74,64,53,0.75)',
    successSoft: 'rgba(76,175,80,0.16)',
    errorSoft: 'rgba(244,67,54,0.14)',
    primarySoft: 'rgba(212,165,116,0.16)',
    warningSoft: 'rgba(255,152,0,0.16)',
    infoSoft: 'rgba(33,150,243,0.16)',
    pvp: '#b85b4f',
    pvpRed: '#d36b5f',
    pvpOrange: '#d89a4b',
    pvpGold: '#d4a574',
    pvpAmber: '#b98549',
    pvpBronze: '#8f6238',
    pvpBlue: '#7a9eb8',
};

const rootStyle = {
    width: '100%',
    height: '100%',
    background: COLORS.background,
    color: COLORS.textPrimary,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
    borderRadius: 20,
    padding: 12,
    boxSizing: 'border-box',
};

const INPUT_STYLE = {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    background: COLORS.surfaceInset,
    color: COLORS.lightText,
    border: `1px solid ${COLORS.border}`,
    fontSize: 12,
};

function getSlotsPerTeam(mode) {
    const parsed = Number(String(mode || '').split('v')[0]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function useViewportSize() {
    const getSize = () => ({
        width: typeof window === 'undefined' ? 420 : window.innerWidth,
        height: typeof window === 'undefined' ? 680 : window.innerHeight,
    });

    const [size, setSize] = useState(getSize);

    useEffect(() => {
        const handleResize = () => setSize(getSize());
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
}

function UpdatePrompt({ prompt, busy, onClose, onDownload, onInstall }) {
    if (!prompt) return null;

    const isAvailable = prompt.type === 'available';
    const isDownloading = prompt.type === 'downloading';
    const isDownloaded = prompt.type === 'downloaded';
    const isError = prompt.type === 'error';
    const progress = typeof prompt.percent === 'number' ? Math.max(0, Math.min(100, prompt.percent)) : 0;

    let title = 'Actualizacion de WakGroup';
    let message = 'Hay una novedad lista para tu miniapp.';
    let detail = prompt.detail || '';

    if (isAvailable) {
        title = `WakGroup ${prompt.version} disponible`;
        message = 'Hay una nueva version y ya comenzo a descargarse en segundo plano.';
    } else if (isDownloading) {
        title = 'Descargando actualizacion';
        message = `La nueva version se esta descargando (${Math.round(progress)}%).`;
        detail = 'Puedes seguir usando la miniapp mientras termina la descarga.';
    } else if (isDownloaded) {
        title = `WakGroup ${prompt.version} listo para instalar`;
        message = 'La actualizacion ya se descargo y se instalara en silencio cuando cierres la miniapp.';
    } else if (isError) {
        title = 'No se pudo actualizar';
        message = prompt.message || 'Ocurrio un problema al revisar o descargar la actualizacion.';
    }

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(12, 9, 7, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 18,
            WebkitAppRegion: 'no-drag',
        }}>
            <div style={{
                width: '100%',
                maxWidth: 320,
                background: `linear-gradient(180deg, ${COLORS.backgroundLight} 0%, ${COLORS.secondary} 100%)`,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
                borderRadius: 18,
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '14px 16px 12px',
                    borderBottom: `1px solid ${COLORS.borderLight}`,
                    background: COLORS.primarySoft,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="../assets/logo.png" alt="WakGroup" style={{ width: 30, height: 30, borderRadius: 8 }} />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{title}</div>
                            <div style={{ fontSize: 11, color: COLORS.textSecondary }}>Mini app de WakGroup</div>
                        </div>
                    </div>
                </div>
                <div style={{ padding: 16 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: COLORS.textPrimary }}>{message}</p>
                    {detail && <p style={{ margin: '8px 0 0', fontSize: 11, lineHeight: 1.5, color: COLORS.textSecondary }}>{detail}</p>}
                    {isDownloading && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ height: 8, borderRadius: 999, background: COLORS.buttonMuted, overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }} />
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 16px 16px' }}>
                    {!isDownloading && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: `1px solid ${COLORS.border}`,
                                background: COLORS.buttonMuted,
                                color: COLORS.lightText,
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Mas tarde
                        </button>
                    )}
                    {isAvailable && null}
                    {isDownloaded && (
                        <button
                            onClick={onInstall}
                            disabled={busy}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                                color: COLORS.darkText,
                                cursor: busy ? 'wait' : 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            Instalar ahora
                        </button>
                    )}
                    {isError && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: COLORS.error,
                                color: COLORS.lightText,
                                cursor: 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            Entendido
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Vista principal: lista de grupos, click en tarjeta = detalle; botón chat en cada tarjeta
function MainView({ language = 'es', setLanguage }) {
    const { width: viewportWidth } = useViewportSize();
    const [apiUrl, setApiUrl] = useState('');
    const [clickThrough, setClickThrough] = useState(false);
    const [groups, setGroups] = useState([]);
    const [pvpGroups, setPvpGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [loadingPvpGroups, setLoadingPvpGroups] = useState(true);
    const [groupsError, setGroupsError] = useState('');
    const [pvpError, setPvpError] = useState('');
    const [opacity, setOpacity] = useState(0.9);
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [showPvp, setShowPvp] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [updatePrompt, setUpdatePrompt] = useState(null);
    const [updateBusy, setUpdateBusy] = useState(false);

    const fetchUser = useCallback(async () => {
        if (!apiUrl) return;
        const token = localStorage.getItem('session_token');
        if (!token) { setUser(null); return; }
        setLoadingUser(true);
        try {
            const res = await axios.get(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
            setUser(res.data);
        } catch {
            localStorage.removeItem('session_token');
            setUser(null);
        } finally {
            setLoadingUser(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getApiUrl().then(setApiUrl);
            window.electronAPI.onClickThroughChanged(setClickThrough);
            window.electronAPI.onOAuthToken((token) => {
                localStorage.setItem('session_token', token);
                fetchUser();
            });
            window.electronAPI.onUpdaterStatus((payload) => {
                setUpdatePrompt(payload);
                if (payload?.type !== 'downloading') {
                    setUpdateBusy(false);
                }
            });
            
            // Listen for auth token from browser callback
            try {
                const bc = new BroadcastChannel('wakgroup-auth');
                bc.onmessage = (event) => {
                    localStorage.setItem('session_token', event.data);
                    fetchUser();
                };
            } catch(e) { }
            
            // Also check localStorage for token
            const storedAuthToken = localStorage.getItem('wakfu-auth-token');
            if (storedAuthToken && !localStorage.getItem('session_token')) {
                localStorage.setItem('session_token', storedAuthToken);
                localStorage.removeItem('wakfu-auth-token');
                fetchUser();
            }
            
            // Listen for storage events (cross-tab communication)
            window.addEventListener('storage', (e) => {
                if (e.key === 'wakfu-auth-token' && e.newValue) {
                    localStorage.setItem('session_token', e.newValue);
                    fetchUser();
                }
            });
        }
        const storedOpacity = localStorage.getItem('wak_overlay_opacity');
        if (storedOpacity) {
            const v = parseFloat(storedOpacity);
            if (!Number.isNaN(v)) {
                setOpacity(v);
                if (window.electronAPI) window.electronAPI.setOpacity(v);
            }
        } else if (window.electronAPI) {
            window.electronAPI.setOpacity(0.9);
        }
    }, [fetchUser]);

    useEffect(() => { if (apiUrl) fetchUser(); }, [apiUrl, fetchUser]);

    useEffect(() => {
        if (!apiUrl) return;
        setLoadingGroups(true);
        setGroupsError('');
        axios.get(`${apiUrl}/groups`).then((res) => setGroups(res.data || [])).catch(() => setGroupsError(getTranslation('overlay.errorLoadGroups', language))).finally(() => setLoadingGroups(false));
    }, [apiUrl]);

    const refreshNotifications = () => {
        if (!apiUrl || !user) return;
        const token = localStorage.getItem('session_token');
        setNotifLoading(true);
        axios.get(`${apiUrl}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setNotifications(r.data || []))
            .catch(() => {})
            .finally(() => setNotifLoading(false));
    };

    useEffect(() => {
        if (!apiUrl || !user) {
            setNotifications([]);
            return;
        }
        
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 15000);
        return () => clearInterval(interval);
    }, [apiUrl, user]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAllRead = () => {
        const token = localStorage.getItem('session_token');
        axios.patch(`${apiUrl}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))))
            .catch(() => {});
    };

    const handleNotifAction = async (notif, action) => {
        const payload = typeof notif.payload === 'string' ? JSON.parse(notif.payload) : (notif.payload || {});
        const applicationId = payload.application_id;
        const groupType = payload.group_type === 'pvp' ? 'pvp' : 'dungeon';
        if (!applicationId || !apiUrl) return;
        
        const token = localStorage.getItem('session_token');
        const endpoint = groupType === 'pvp' ? `${apiUrl}/pvp-applications/${applicationId}` : `${apiUrl}/applications/${applicationId}`;
        
        try {
            await axios.patch(endpoint, { action }, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, processed: action } : n));
        } catch (err) {}
    };

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        if (window.electronAPI) window.electronAPI.setOpacity(n);
    };

    const handleDownloadUpdate = async () => {
        try {
            setUpdateBusy(true);
            await window.electronAPI?.downloadUpdate?.();
        } catch (error) {
            setUpdatePrompt({ type: 'error', message: error?.message || 'No se pudo iniciar la descarga.' });
            setUpdateBusy(false);
        }
    };

    const handleInstallUpdate = async () => {
        try {
            setUpdateBusy(true);
            await window.electronAPI?.installUpdate?.();
        } catch (error) {
            setUpdatePrompt({ type: 'error', message: error?.message || 'No se pudo instalar la actualizacion.' });
            setUpdateBusy(false);
        }
    };

    const currentGroups = showPvp ? pvpGroups : groups;
    const loading = showPvp ? loadingPvpGroups : loadingGroups;
    const error = showPvp ? pvpError : groupsError;
    const isCompact = viewportWidth < 420;
    const handleGroupClick = (g) => {
        if (showPvp) {
            window.electronAPI?.openPvpGroupDetail?.(g.id);
        } else {
            window.electronAPI?.openGroupDetail?.(g.id);
        }
    };

    return (
        <div style={rootStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, WebkitAppRegion: 'drag', cursor: 'move' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                        src="../assets/logo.png"
                        alt="WakGroup"
                        style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>WakGroup</span>
                    <span style={{ fontSize: 11, color: COLORS.titleMuted, marginLeft: 6 }}>Desktop Overlay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag', position: 'relative' }}>
                    {user && (
                        <div style={{ position: 'relative', width: 28, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) handleMarkAllRead(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                🔔
                                {unreadCount > 0 && (
                                        <span style={{ position: 'absolute', top: -6, right: -6, background: COLORS.error, color: COLORS.lightText, borderRadius: 8, fontSize: 8, fontWeight: 'bold', minWidth: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {showNotifs && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, width: 280, maxHeight: 350, background: COLORS.surfaceElevated, border: `1px solid ${COLORS.border}`, borderRadius: 8, zIndex: 1000, overflow: 'hidden', marginTop: 4 }}>
                                    <div style={{ padding: '8px 10px', borderBottom: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.primaryDark }}>🔔 {getTranslation('overlay.notifications', language)}</span>
                                        <button onClick={refreshNotifications} style={{ background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: 10, cursor: 'pointer' }}>🔄</button>
                                    </div>
                                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                        {notifLoading ? (
                                            <div style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary, fontSize: 11 }}>{getTranslation('common.loading', language)}</div>
                                        ) : notifications.length === 0 ? (
                                            <div style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary, fontSize: 11 }}>{getTranslation('overlay.noNotifications', language)}</div>
                                        ) : (
                                            notifications.slice(0, 30).map(n => {
                                                const TYPE_LABELS = {
                                                    application_received: { icon: '📨', label: getTranslation('notif.newApplication', language) },
                                                    application_accepted: { icon: '✅', label: getTranslation('notif.applicationAccepted', language) },
                                                    application_rejected: { icon: '❌', label: getTranslation('notif.applicationRejected', language) },
                                                    group_message: { icon: '💬', label: getTranslation('notif.message', language) },
                                                };
                                                const meta = TYPE_LABELS[n.type] || { icon: '📣', label: n.type };
                                                const payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : (n.payload || {});
                                                const isAppReceived = n.type === 'application_received';
                                                const appId = payload.application_id;
                                                const processed = n.processed;
                                                
                                                return (
                                                    <div key={n.id} style={{ padding: '8px 10px', borderBottom: `1px solid ${COLORS.borderLight}`, background: n.is_read ? 'transparent' : 'rgba(212,165,116,0.08)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                        <span style={{ fontSize: 16 }}>{meta.icon}</span>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 11, fontWeight: n.is_read ? 400 : 600, marginBottom: 2 }}>{meta.label}</div>
                                                            {payload.from_username && (
                                                                <div style={{ fontSize: 10, color: COLORS.textSecondary }}>
                                                                    <span style={{ color: COLORS.primaryDark }}>{payload.from_username}</span>
                                                                    {payload.char_name && <> · {payload.char_name}</>}
                                                                </div>
                                                            )}
                                                            {isAppReceived && appId && (
                                                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                                    {processed === 'accepted' ? (
                                                                        <span style={{ fontSize: 10, color: COLORS.success, fontWeight: 'bold' }}>✅ Aceptado</span>
                                                                    ) : processed === 'rejected' ? (
                                                                        <span style={{ fontSize: 10, color: COLORS.error, fontWeight: 'bold' }}>❌ Rechazado</span>
                                                                    ) : (
                                                                        <>
                                                                            <button onClick={() => handleNotifAction(n, 'accepted')} style={{ background: COLORS.successSoft, border: `1px solid ${COLORS.success}`, borderRadius: 4, color: COLORS.success, cursor: 'pointer', fontSize: 10, padding: '2px 6px', fontWeight: 'bold' }}>✓</button>
                                                                            <button onClick={() => handleNotifAction(n, 'rejected')} style={{ background: COLORS.errorSoft, border: `1px solid ${COLORS.error}`, borderRadius: 4, color: COLORS.error, cursor: 'pointer', fontSize: 10, padding: '2px 6px', fontWeight: 'bold' }}>✕</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{
                            background: COLORS.buttonMuted,
                            color: COLORS.lightText,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 4,
                            padding: '2px 4px',
                            fontSize: 10,
                            cursor: 'pointer',
                        }}
                    >
                        {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
                            <option key={code} value={code} style={{ background: COLORS.background }}>
                                {flag} {label}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => window.electronAPI?.minimizeWindow?.()} style={btnStyle(COLORS.warning)}>─</button>
                    <button onClick={() => window.electronAPI?.closeWindow?.()} style={btnStyle(COLORS.error)}>✕</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => window.electronAPI?.toggleClickThrough?.()} style={{ padding: 12, background: clickThrough ? COLORS.error : COLORS.primaryDark, color: COLORS.lightText, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                    {clickThrough ? `🔒 ${getTranslation('overlay.clickThroughOn', language)}` : `🔓 ${getTranslation('overlay.clickThroughOff', language)}`}
                </button>
                <div style={{ display: 'flex', gap: 8, flexDirection: isCompact ? 'column' : 'row' }}>
                    <button onClick={() => setShowPvp(false)} style={{ flex: 1, padding: 12, background: !showPvp ? COLORS.primary : COLORS.buttonMuted, color: !showPvp ? COLORS.darkText : COLORS.lightText, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>⚔ PvE</button>
                    <button onClick={() => setShowPvp(true)} style={{ flex: 1, padding: 12, background: showPvp ? COLORS.pvp : COLORS.buttonMuted, color: COLORS.lightText, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>⚔ PVP</button>
                </div>
                {user && (
                    <button onClick={() => window.electronAPI?.openCreateGroup?.(showPvp ? 'pvp' : 'pve')} style={{ padding: 12, background: showPvp ? COLORS.pvp : COLORS.primaryDark, color: COLORS.lightText, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                        ➕ {showPvp ? getTranslation('overlay.createPvp', language) : getTranslation('overlay.createGroup', language)}
                    </button>
                )}
                <button onClick={() => window.electronAPI?.openWiki?.()} style={{ padding: 12, background: COLORS.secondary, color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>📖 Wiki</button>
            </div>

            <div style={{ marginTop: 8, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: COLORS.backgroundLight, borderRadius: 12, padding: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isCompact ? 'flex-start' : 'center', flexDirection: isCompact ? 'column' : 'row', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {loadingUser && <span style={{ fontSize: 10, color: COLORS.textSecondary }}>...</span>}
                        {user && (
                            <>
                                {user.avatar ? <img src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} /> : <span style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.primaryDark, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: COLORS.lightText }}>{user.username?.[0]?.toUpperCase() || '?'}</span>}
                                <span style={{ fontSize: 11, color: COLORS.textPrimary, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</span>
                                <button onClick={() => { localStorage.removeItem('session_token'); setUser(null); }} style={{ padding: '2px 6px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.buttonMutedStrong, color: COLORS.lightText, cursor: 'pointer' }}>{getTranslation('overlay.logout', language)}</button>
                            </>
                        )}
                        {!user && !loadingUser && (
                            <button onClick={() => window.electronAPI?.openLogin?.()} style={{ padding: '4px 8px', fontSize: 11, borderRadius: 999, border: 'none', background: COLORS.primaryDark, color: COLORS.lightText, cursor: 'pointer' }}>🔑 Login</button>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isCompact ? 'flex-start' : 'center', flexDirection: isCompact ? 'column' : 'row', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary }}>{showPvp ? getTranslation('overlay.activePvp', language) : getTranslation('overlay.activeGroups', language)}</span>
                        <button onClick={() => {
                            if (showPvp) {
                                setLoadingPvpGroups(true);
                                axios.get(`${apiUrl}/pvp-groups`).then((res) => setPvpGroups(res.data || [])).catch(() => setPvpError(getTranslation('overlay.errorLoadPvp', language))).finally(() => setLoadingPvpGroups(false));
                            } else {
                                setLoadingGroups(true);
                                axios.get(`${apiUrl}/groups`).then((res) => setGroups(res.data || [])).catch(() => setGroupsError(getTranslation('overlay.errorLoadGroups', language))).finally(() => setLoadingGroups(false));
                            }
                        }} style={{ padding: '4px 10px', fontSize: 10, borderRadius: 6, border: 'none', background: COLORS.buttonMuted, color: COLORS.lightText, cursor: 'pointer' }}>🔄</button>
                    </div>
                    {error && !loading && <div style={{ fontSize: 12, color: COLORS.error }}>{error}</div>}
                    {!loading && !error && currentGroups.length === 0 && <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{showPvp ? getTranslation('overlay.noActivePvp', language) : getTranslation('overlay.noActiveGroups', language)}</div>}
                    {!loading && !error && currentGroups.map((g) => (
                        <div
                            key={g.id}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 12,
                                background: COLORS.card,
                                border: `1px solid ${showPvp ? COLORS.borderLight : COLORS.border}`,
                                cursor: 'pointer',
                            }}
                            onClick={() => handleGroupClick(g)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 12 }}>
                                    {showPvp
                                        ? (g.title || `PVP ${g.pvp_mode}`)
                                        : (g.dungeon_id && mazmosById.get(Number(g.dungeon_id))
                                            ? getDungeonName(mazmosById.get(Number(g.dungeon_id)), language)
                                            : (g.dungeon_name || getTranslation('group.dungeon', language))
                                        )
                                    }
                                </span>
                                <span style={{ fontSize: 10, color: COLORS.textSecondary }}>{g.server}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, fontSize: 10, color: COLORS.textSecondary, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                {showPvp ? (
                                    <>
                                        <span style={{ color: PVP_MODE_COLORS[g.pvp_mode] || COLORS.primaryDark, fontWeight: 600 }}>{g.pvp_mode}</span>
                                        <span>{getTranslation('common.levelShort', language)} {g.equipment_band}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{getTranslation('common.stasis', language)} {g.stasis}</span>
                                        <span>{getTranslation('common.levelShort', language)} {g.dungeon_lvl}</span>
                                        {g.steles_active && (
                                            <span style={{ background: COLORS.primarySoft, color: COLORS.primary, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>🗼 {g.steles_count}</span>
                                        )}
                                        {g.intervention_active && (
                                            <span style={{ background: COLORS.warningSoft, color: COLORS.warning, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>⚡ Int</span>
                                        )}
                                        {g.steles_active && g.steles_drops && g.steles_drops.length > 0 && (
                                            <span style={{ background: COLORS.successSoft, color: COLORS.success, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>💎 Drops</span>
                                        )}
                                    </>
                                )}
                                <span>{g.status === 'open' ? '🟢' : '🔴'}</span>
                                {!showPvp && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.electronAPI?.openChat?.(g.id); }}
                                        style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: COLORS.info, color: COLORS.lightText, cursor: 'pointer' }}
                                    >
                                        💬
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ fontSize: 10, color: COLORS.titleMuted, marginTop: 6, borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>WakGroup Overlay</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>Opacidad</span>
                    <input type="range" min="0.3" max="1" step="0.05" value={opacity} onChange={(e) => handleOpacityChange(Number(e.target.value))} style={{ width: 80 }} />
                </div>
            </div>
            <UpdatePrompt
                prompt={updatePrompt}
                busy={updateBusy}
                onClose={() => { if (updatePrompt?.type !== 'downloading') setUpdatePrompt(null); }}
                onDownload={handleDownloadUpdate}
                onInstall={handleInstallUpdate}
            />
        </div>
    );
}

function ConfirmModal({ dialog, onConfirm, onCancel }) {
    if (!dialog) return null;

    const isDanger = dialog.variant === 'danger';
    const confirmColor = isDanger ? COLORS.error : COLORS.primaryDark;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2200,
            background: 'rgba(12, 9, 7, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            WebkitAppRegion: 'no-drag',
        }}>
            <div style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 18,
                overflow: 'hidden',
                border: `1px solid ${COLORS.border}`,
                background: `linear-gradient(180deg, ${COLORS.backgroundLight} 0%, ${COLORS.secondary} 100%)`,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            }}>
                <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${COLORS.borderLight}`, background: COLORS.primarySoft }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="../assets/logo.png" alt="WakGroup" style={{ width: 30, height: 30, borderRadius: 8 }} />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{dialog.title || 'WakGroup'}</div>
                            <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{dialog.subtitle || 'Confirmación'}</div>
                        </div>
                    </div>
                </div>
                <div style={{ padding: 16 }}>
                    <p style={{ margin: 0, color: COLORS.textPrimary, fontSize: 13, lineHeight: 1.5 }}>{dialog.message}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 16px 16px' }}>
                    <button onClick={onCancel} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.buttonMuted, color: COLORS.lightText, cursor: 'pointer', fontWeight: 600 }}>
                        {dialog.cancelLabel || getTranslation('common.cancel', dialog.language)}
                    </button>
                    <button onClick={onConfirm} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: confirmColor, color: isDanger ? COLORS.lightText : COLORS.darkText, cursor: 'pointer', fontWeight: 700 }}>
                        {dialog.confirmLabel || getTranslation('common.confirm', dialog.language)}
                    </button>
                </div>
            </div>
        </div>
    );
}

function useConfirmDialog(language) {
    const [dialog, setDialog] = useState(null);

    const requestConfirmation = useCallback((options) => new Promise((resolve) => {
        setDialog({
            language,
            ...options,
            resolve,
        });
    }), [language]);

    const closeDialog = useCallback((result) => {
        setDialog((current) => {
            current?.resolve?.(result);
            return null;
        });
    }, []);

    return {
        dialog,
        requestConfirmation,
        confirmDialogNode: (
            <ConfirmModal
                dialog={dialog}
                onConfirm={() => closeDialog(true)}
                onCancel={() => closeDialog(false)}
            />
        ),
    };
}

// Vista detalle del grupo PvE
function GroupDetailView({ groupId, language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const { requestConfirmation, confirmDialogNode } = useConfirmDialog(language);
    const [apiUrl, setApiUrl] = useState('');
    const [group, setGroup] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [user, setUser] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isLeader, setIsLeader] = useState(false);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);
    const [showDrops, setShowDrops] = useState(false);
    const [drops, setDrops] = useState([]);

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
    }, []);

    useEffect(() => {
        if (!apiUrl || !groupId) return;
        const token = localStorage.getItem('session_token');
        setLoading(true);
        setError(null);
        Promise.all([
            axios.get(`${apiUrl}/groups/${groupId}`),
            token ? axios.get(`${apiUrl}/characters`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            token ? axios.get(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        ]).then(([groupRes, charsRes, userRes]) => {
            const g = groupRes.data;
            setGroup(g);
            setCharacters(charsRes.data || []);
            const u = userRes.data;
            setUser(u);
            if ((charsRes.data || []).length > 0) setSelectedCharId(charsRes.data[0].id);
            setIsMember(!!u && (g.leader_user_id === u.id || (g.members || []).some((m) => m.user_id === u.id)));
            setIsLeader(!!u && g.leader_user_id === u.id);
            if (g.steles_active && g.steles_drops) {
                const parseDrops = (dropsData) => {
                    if (!dropsData) return [];
                    if (Array.isArray(dropsData)) return dropsData;
                    if (typeof dropsData === 'string') {
                        try { return JSON.parse(dropsData); } catch { return []; }
                    }
                    return [];
                };
                const selectedDrops = parseDrops(g.steles_drops);
                if (selectedDrops.length > 0) {
                    // Use local items data
                    const drops = selectedDrops.map(itemId => {
                        const item = itemsData.find(it => it.definition?.item?.id === itemId);
                        return {
                            id: itemId,
                            title: item?.title || { es: `Item ${itemId}` },
                            graphic_parameters: {
                                gfxId: item?.definition?.item?.graphicParameters?.gfxId || null,
                            },
                        };
                    });
                    setDrops(drops);
                }
            }
        }).catch(() => setError(getTranslation('group.errorLoad', language))).finally(() => setLoading(false));
    }, [apiUrl, groupId]);

    const dungeonInfo = group?.dungeon_id ? mazmosData.find(d => String(d.id) === String(group.dungeon_id)) : null;
    const dungeonName = dungeonInfo ? getDungeonName(dungeonInfo, language) : group?.dungeon_name || '';
    const isCompact = viewportWidth < 390;

    const handleApply = () => {
        if (!selectedCharId || !group) return;
        setApplying(true);
        setError(null);
        const token = localStorage.getItem('session_token');
        axios.post(`${apiUrl}/applications`, { group_id: groupId, character_id: selectedCharId }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { setMessage(getTranslation('group.applySent', language)); })
            .catch((err) => setError(err.response?.data?.error || getTranslation('group.errorApply', language)))
            .finally(() => setApplying(false));
    };

    const handleDelete = async () => {
        if (!group || !user) return;
        if (group.leader_user_id !== user.id) return;
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmDelete', language),
            variant: 'danger',
        });
        if (!confirmed) return;
        setDeleting(true);
        setError(null);
        const token = localStorage.getItem('session_token');
        axios.delete(`${apiUrl}/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { window.electronAPI?.closeCurrentWindow?.(); })
            .catch((err) => { setError(err.response?.data?.error || getTranslation('group.errorDelete', language)); setDeleting(false); });
    };

    const handleLeaveGroup = async () => {
        if (!user || !apiUrl) return;
        const userChar = characters.find(c => c.user_id === user.id);
        if (!userChar) {
            setError(getTranslation('group.errorNoCharacters', language));
            return;
        }
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmLeave', language),
            variant: 'danger',
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/groups/${groupId}/members/${userChar.id}`, { headers: { Authorization: `Bearer ${token}` } });
            window.electronAPI?.closeCurrentWindow?.();
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorLeave', language));
        }
    };

    const handleKickMember = async (characterId, charName) => {
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmKick', language).replace('{name}', charName),
            variant: 'danger',
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/groups/${groupId}/members/${characterId}`, { headers: { Authorization: `Bearer ${token}` } });
            const g = await axios.get(`${apiUrl}/groups/${groupId}`);
            setGroup(g.data);
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorKick', language));
        }
    };

    const handleLeaveGroupAsLeader = async () => {
        const members = group.members || [];
        if (members.length === 0) {
            const confirmed = await requestConfirmation({
                message: getTranslation('group.confirmClose', language),
                variant: 'danger',
            });
            if (!confirmed) return;
            setDeleting(true);
            const token = localStorage.getItem('session_token');
            try {
                await axios.delete(`${apiUrl}/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
                window.electronAPI?.closeCurrentWindow?.();
            } catch (err) {
                setError(err.response?.data?.error || getTranslation('group.errorClose', language));
                setDeleting(false);
            }
            return;
        }
        
        const newLeader = members[0];
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmLeaveLeader', language).replace('{name}', newLeader.char_name),
            variant: 'danger',
        });
        if (!confirmed) return;
        
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/groups/${groupId}/leader`, { headers: { Authorization: `Bearer ${token}` } });
            window.electronAPI?.closeCurrentWindow?.();
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorTransfer', language));
        }
    };

    const handleTransferLeadership = async (newLeaderCharId, newLeaderName) => {
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmTransfer', language).replace('{name}', newLeaderName),
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.put(`${apiUrl}/groups/${groupId}/transfer-leadership`, { new_leader_character_id: newLeaderCharId }, { headers: { Authorization: `Bearer ${token}` } });
            const g = await axios.get(`${apiUrl}/groups/${groupId}`);
            setGroup(g.data);
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorTransfer', language));
        }
    };

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    if (!groupId) return <div style={rootStyle}>{getTranslation('common.invalidGroupId', language)}</div>;

    return (
        <div style={rootStyle}>
            <WindowChrome title={getTranslation('group.detailTitle', language)} subtitle={dungeonName} clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {loading && <div style={{ textAlign: 'center', color: COLORS.textSecondary }}>{getTranslation('common.loading', language)}</div>}
                {!loading && !group && <div style={{ color: COLORS.error }}>{getTranslation('group.notFound', language)}</div>}
                {!loading && group && (
                    <>
                        {group.dungeon_image && <img src={`${apiUrl}/${group.dungeon_image}`} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />}
                        {group.title && <h3 style={{ marginBottom: 6, fontSize: 14 }}>{group.title}</h3>}
                        {group.description && <p style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 }}>{group.description}</p>}
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12, fontSize: 11 }}>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.level', language)}:</span> {group.dungeon_lvl}</div>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.stasis', language)}:</span> {group.stasis}</div>
                            {group.steles_active !== undefined && (
                                <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.steles', language)}:</span> {group.steles_active ? `${getTranslation('common.yes', language)} (${group.steles_count || 0})` : getTranslation('common.no', language)}</div>
                            )}
                            {group.intervention_active !== undefined && (
                                <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.intervention', language)}:</span> {group.intervention_active ? getTranslation('common.yes', language) : getTranslation('common.no', language)}</div>
                            )}
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.server', language)}:</span> {group.server}</div>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.status', language)}:</span> {group.status === 'open' ? '🟢' : '🔴'}</div>
                        </div>
                        {group.steles_active && drops.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                <button onClick={() => setShowDrops(!showDrops)} style={{ padding: '6px 12px', background: showDrops ? COLORS.primaryDark : COLORS.buttonMuted, color: showDrops ? COLORS.darkText : COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>
                                    {showDrops ? getTranslation('group.dropsHide', language) : getTranslation('group.dropsActive', language)}
                                </button>
                                {showDrops && (
                                    <div style={{ background: COLORS.surfaceInset, borderRadius: 8, padding: 10 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? 54 : 60}px, 1fr))`, gap: 8 }}>
                                            {drops.map((d) => (
                                                <div key={d.id} style={{ textAlign: 'center' }}>
                                                    <img src={`${apiUrl}/assets/items/${d.graphic_parameters?.gfxId || '0000000'}.png`} alt="" style={{ width: 36, height: 36, borderRadius: 6, background: COLORS.surfaceInset, display: 'block', margin: '0 auto' }} />
                                                    <div style={{ fontSize: 8, color: COLORS.textPrimary, marginTop: 4 }}>{d.title?.es || `Item ${d.id}`}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ marginBottom: 10 }}>
                            <h4 style={{ fontSize: 12, marginBottom: 6 }}>{getTranslation('group.membersTitle', language).replace('{count}', String((group.members?.length || 0) + 1))}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, background: COLORS.surfaceInset, borderRadius: 4 }}>
                                    {group.leader_class_icon && <img src={`${apiUrl}/${group.leader_class_icon}`} alt="" style={{ width: 24, height: 24 }} />}
                                    <span>{group.leader_name}</span>
                                    <span style={{ fontSize: 10, color: COLORS.textSecondary }}>{group.leader_class_name}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 9, background: COLORS.primaryDark, color: COLORS.darkText, padding: '2px 6px', borderRadius: 4 }}>{getTranslation('group.leader', language)}</span>
                                </div>
                                {(group.members || []).map((m) => (
                                    <div key={m.membership_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, background: COLORS.surfaceInset, borderRadius: 4 }}>
                                        {m.class_icon && <img src={`${apiUrl}/${m.class_icon}`} alt="" style={{ width: 24, height: 24 }} />}
                                        <span>{m.char_name}</span>
                                        <span style={{ fontSize: 10, color: COLORS.textSecondary }}>{m.class_name}</span>
                                        {isLeader && (
                                            <button onClick={() => handleKickMember(m.char_id, m.char_name)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px' }} title={getTranslation('group.kick', language)}>👢</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {error && <div style={{ color: COLORS.error, fontSize: 12, marginBottom: 8 }}>{error}</div>}
                        {message && <div style={{ color: COLORS.success, fontSize: 12, marginBottom: 8 }}>{message}</div>}
                        {user && group.status === 'open' && (
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.selectChar', language)}</label>
                                <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 4, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
                                    <option value="">Elige un personaje</option>
                                    {characters.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.class_name} {getTranslation('common.levelShort', language)}{c.level}</option>)}
                                </select>
                                <button onClick={handleApply} disabled={applying || !selectedCharId} style={{ padding: '8px 12px', background: COLORS.primaryDark, color: COLORS.darkText, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12, width: '100%' }}>{applying ? 'Enviando...' : '⚔ Solicitar Unirse'}</button>
                            </div>
                        )}
                        {user && group && group.leader_user_id === user.id && (
                            <>
                                <button onClick={handleDelete} disabled={deleting} style={{ width: '100%', padding: 10, marginBottom: 8, background: COLORS.error, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>{deleting ? 'Eliminando...' : '🗑 Eliminar grupo'}</button>
                                {group.members && group.members.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <select onChange={(e) => { if (e.target.value) { handleTransferLeadership(e.target.value, group.members.find(m => m.char_id === e.target.value)?.char_name); e.target.value = ''; } }} style={{ width: '100%', padding: 6, borderRadius: 4, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 11 }}>
                                            <option value="">{getTranslation('group.transfer', language)}</option>
                                            {group.members.map((m) => <option key={m.char_id} value={m.char_id}>{m.char_name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button onClick={handleLeaveGroupAsLeader} style={{ width: '100%', padding: 10, marginBottom: 8, background: COLORS.warning, color: COLORS.darkText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🚪 {getTranslation('group.leaveAsLeader', language)}</button>
                            </>
                        )}
                        {isMember && !isLeader && (
                            <button onClick={handleLeaveGroup} style={{ width: '100%', padding: 10, marginBottom: 8, background: COLORS.error, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🚪 {getTranslation('group.leave', language)}</button>
                        )}
                        <button onClick={() => window.electronAPI?.openChat?.(groupId)} style={{ width: '100%', padding: 10, background: COLORS.info, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>💬 Abrir chat</button>
                    </>
                )}
            </div>
            {confirmDialogNode}
        </div>
    );
}

// Chat view
function ChatView({ groupId, language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const [apiUrl, setApiUrl] = useState('');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [user, setUser] = useState(null);
    const [isMember, setIsMember] = useState(undefined);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);
    const socketRef = useRef(null);
    const bottomRef = useRef(null);
    const isCompact = viewportWidth < 380;

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
    }, []);

    useEffect(() => {
        if (!apiUrl || !groupId) return;
        const token = localStorage.getItem('session_token');

        axios.get(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setUser(r.data))
            .catch(() => setUser(null));

        axios.get(`${apiUrl}/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setMessages(r.data || []))
            .catch(() => setMessages([]))
            .finally(() => setLoadingHistory(false));

        const socket = io(apiUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            socket.emit('join_group', groupId);
        });
        socket.on('joined_group', () => setIsMember(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setError(getTranslation('chat.connectError', language)));
        socket.on('error', (msg) => {
            setError(msg || getTranslation('common.error', language));
            setIsMember(false);
        });
        socket.on('new_message', (msg) => {
            setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });

        return () => {
            socket.emit('leave_group', groupId);
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [apiUrl, groupId]);

    const sendMessage = () => {
        if (!input.trim() || !socketRef.current?.connected) return;
        socketRef.current.emit('send_message', { groupId, content: input.trim() });
        setInput('');
    };

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    if (!groupId) return <div style={rootStyle}>{getTranslation('common.invalidGroupId', language)}</div>;

    return (
        <div style={rootStyle}>
            <WindowChrome title={getTranslation('chat.title', language)} subtitle={groupId.slice(0, 8)} clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {isMember === false && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: COLORS.surfaceInset, borderRadius: 8 }}>
                        <span style={{ fontSize: 28 }}>🔒</span>
                        <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>{getTranslation('chat.onlyMembers', language)}</p>
                    </div>
                )}
                {isMember !== false && (
                    <>
                        <div style={{ padding: '8px 0', fontSize: 11, color: connected ? COLORS.success : COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? COLORS.success : COLORS.titleMuted, display: 'inline-block' }} />
                            {connected ? 'Conectado' : 'Conectando...'}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {loadingHistory && <div style={{ textAlign: 'center', color: COLORS.textSecondary }}>{getTranslation('chat.loadingMessages', language)}</div>}
                            {!loadingHistory && messages.length === 0 && <div style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: 12 }}>{getTranslation('chat.noMessages', language)}</div>}
                            {messages.map((msg) => (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: msg.user_id === user?.id ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                                    <img src={msg.avatar ? `https://cdn.discordapp.com/avatars/${msg.discord_id}/${msg.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                                    <div style={{ maxWidth: isCompact ? '88%' : '75%' }}>
                                        <span style={{ fontSize: 10, color: COLORS.textSecondary, display: 'block', marginBottom: 2 }}>{msg.user_id !== user?.id && <strong style={{ color: COLORS.primaryDark, marginRight: 4 }}>{msg.username}</strong>}{new Date(typeof msg.created_at === 'number' ? msg.created_at * 1000 : msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <div style={{ padding: '8px 12px', borderRadius: msg.user_id === user?.id ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.user_id === user?.id ? COLORS.primaryDark : COLORS.surfaceInset, color: msg.user_id === user?.id ? COLORS.darkText : COLORS.textPrimary, fontSize: 13 }}>{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {error && <div style={{ color: COLORS.error, fontSize: 12 }}>{error}</div>}
                            <div ref={bottomRef} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                                placeholder={getTranslation('chat.placeholder', language)}
                                maxLength={500}
                                disabled={!connected}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 13, outline: 'none' }}
                            />
                            <button onClick={sendMessage} disabled={!connected || !input.trim()} style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.primaryDark, color: COLORS.darkText, border: 'none', cursor: 'pointer', fontSize: 14 }}>➤</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const PVP_MODE_COLORS = { '1v1': COLORS.pvpRed, '2v2': COLORS.pvpOrange, '3v3': COLORS.pvpGold, '4v4': COLORS.pvpAmber, '5v5': COLORS.pvpBlue, '6v6': COLORS.pvpBronze };
const PVP_MODES = ['1v1', '2v2', '3v3', '4v4', '5v5', '6v6'];
const BAND_OPTIONS = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];

// Vista crear PVP
function CreatePvpGroupView({ language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const [apiUrl, setApiUrl] = useState('');
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        character_id: '',
        title: '',
        pvp_mode: '1v1',
        equipment_band: 200,
        server: 'Ogrest',
    });

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
    }, []);

    useEffect(() => {
        if (!apiUrl) return;
        const token = localStorage.getItem('session_token');
        axios.get(`${apiUrl}/characters`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then(r => setCharacters(r.data || []))
            .finally(() => setLoading(false));
    }, [apiUrl]);

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        const token = localStorage.getItem('session_token');
        try {
            await axios.post(`${apiUrl}/pvp-groups`, {
                leader_char_id: formData.character_id,
                title: formData.title,
                pvp_mode: formData.pvp_mode,
                equipment_band: Number(formData.equipment_band),
                server: formData.server,
            }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            setSuccess(true);
            setTimeout(() => window.electronAPI?.closeCurrentWindow?.(), 1500);
          } catch (err) {
              setError(err.response?.data?.error || getTranslation('pvp.errorCreate', language));
          } finally {
              setSubmitting(false);
          }
      };

    const modeColor = PVP_MODE_COLORS[formData.pvp_mode] || COLORS.primaryDark;
    const isCompact = viewportWidth < 400;

    return (
        <div style={rootStyle}>
              <WindowChrome title={getTranslation('pvp.createTitle', language)} subtitle="PVP" clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: COLORS.textSecondary }}>{getTranslation('common.loading', language)}</div>
                  ) : success ? (
                      <div style={{ textAlign: 'center', color: COLORS.success, fontSize: 14, padding: 20 }}>{getTranslation('pvp.created', language)}</div>
                  ) : (
                      <form onSubmit={handleSubmit}>
                          {error && <div style={{ color: COLORS.error, fontSize: 11, marginBottom: 10 }}>{error}</div>}
                          <div style={{ marginBottom: 12 }}>
                              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.title', language)}</label>
                              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={getTranslation('pvp.titlePlaceholder', language)} maxLength={100} required style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                              <label style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{getTranslation('pvp.mode', language)}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(72px, 1fr))', gap: 6 }}>
                                {PVP_MODES.map((mode) => (
                                    <button key={mode} type="button" onClick={() => setFormData({ ...formData, pvp_mode: mode })} style={{ flex: 1, padding: '10px 6px', border: `2px solid ${formData.pvp_mode === mode ? PVP_MODE_COLORS[mode] : COLORS.border}`, borderRadius: 8, background: formData.pvp_mode === mode ? `${PVP_MODE_COLORS[mode]}22` : COLORS.surfaceInset, color: formData.pvp_mode === mode ? PVP_MODE_COLORS[mode] : COLORS.textSecondary, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{mode}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('pvp.equipmentBandLabel', language)}</label>
                            <select value={formData.equipment_band} onChange={(e) => setFormData({ ...formData, equipment_band: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                {BAND_OPTIONS.map((n) => <option key={n} value={n}>{getTranslation('common.levelShort', language)} {n}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Personaje</label>
                            <select value={formData.character_id} onChange={(e) => setFormData({ ...formData, character_id: e.target.value })} required style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                <option value="">{getTranslation('group.selectChar', language)}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.class_name} {getTranslation('common.levelShort', language)} {c.level}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('common.server', language)}</label>
                            <select value={formData.server} onChange={(e) => setFormData({ ...formData, server: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                <option value="Ogrest">Ogrest</option>
                                <option value="Rubilax">Rubilax</option>
                                <option value="Pandora">Pandora</option>
                            </select>
                        </div>
                        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, background: modeColor, color: COLORS.darkText, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>{submitting ? getTranslation('pvp.creating', language) : `⚔ ${getTranslation('pvp.create', language)}`}</button>
                    </form>
                )}
            </div>
        </div>
    );
}

// Vista crear PvE
function CreatePveGroupView({ language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const [apiUrl, setApiUrl] = useState('');
    const [characters, setCharacters] = useState([]);
    const [dungeons, setDungeons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [dungeonSearch, setDungeonSearch] = useState('');
    const [dungeonOpen, setDungeonOpen] = useState(false);
    const [showDrops, setShowDrops] = useState(false);
    const [dropItems, setDropItems] = useState([]);

    const [formData, setFormData] = useState({
        character_id: '',
        dungeon_id: '',
        title: '',
        stasis: 1,
        server: 'Ogrest',
        steles_active: false,
        steles_count: 1,
        intervention_active: false,
        steles_drops: [],
    });

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        
        const checkDrops = setInterval(() => {
            if (localStorage.getItem('drops_selection_done') === 'true') {
                const drops = localStorage.getItem('selected_drops');
                if (drops) {
                    try {
                        const parsed = JSON.parse(drops);
                        setFormData(prev => ({ ...prev, steles_drops: parsed }));
                    } catch {}
                }
                localStorage.removeItem('drops_selection_done');
                localStorage.removeItem('selected_drops');
            }
        }, 500);
        
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
        
        return () => clearInterval(checkDrops);
    }, []);

    useEffect(() => {
        if (!apiUrl) return;
        const token = localStorage.getItem('session_token');
        setDungeons(mazmosData || []);
        axios.get(`${apiUrl}/characters`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => ({ data: [] }))
            .then(charsRes => setCharacters(charsRes.data || []))
            .finally(() => setLoading(false));
    }, [apiUrl]);

    useEffect(() => {
        if (!formData.dungeon_id) {
            setDropItems([]);
            return;
        }
        const dungeon = mazmosData.find(d => String(d.id) === String(formData.dungeon_id));
        if (dungeon?.jefeId) {
            const mob = wakfuMobs[String(dungeon.jefeId)] || wakfuMobs[dungeon.jefeId];
            if (mob?.drops) {
                const drops = mob.drops.map(d => {
                    const itemId = parseInt(d[0], 10);
                    const dropRate = d[1];
                    const item = itemsData.find(it => it.definition?.item?.id === itemId);
                    return {
                        id: itemId,
                        dropRate,
                        title: item?.title || { es: `Item ${itemId}` },
                        graphic_parameters: {
                            gfxId: item?.definition?.item?.graphicParameters?.gfxId || null,
                        },
                    };
                });
                setDropItems(drops);
            } else {
                setDropItems([]);
            }
        } else {
            setDropItems([]);
        }
    }, [formData.dungeon_id]);

    const selectedDungeon = mazmosData.find(d => String(d.id) === String(formData.dungeon_id));
    const hasSteles = selectedDungeon?.steles;
    const hasIntervention = selectedDungeon?.intervention;
    const stelesLvl = Number(selectedDungeon?.steleslvl || selectedDungeon?.steles_level || 0);
    const isCompact = viewportWidth < 400;

    useEffect(() => {
        if (!hasSteles) {
            setFormData(prev => ({ ...prev, steles_active: false, steles_count: 1, steles_drops: [] }));
        } else if (stelesLvl && formData.steles_count > stelesLvl) {
            setFormData(prev => ({ ...prev, steles_count: 1 }));
        }
        if (!hasIntervention && formData.intervention_active) {
            setFormData(prev => ({ ...prev, intervention_active: false }));
        }
    }, [hasSteles, stelesLvl, hasIntervention, formData.steles_count, formData.intervention_active]);

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    const toggleDrop = (itemId) => {
        setFormData(prev => {
            const exists = prev.steles_drops.includes(itemId);
            const next = exists
                ? prev.steles_drops.filter(id => id !== itemId)
                : [...prev.steles_drops, itemId];
            return { ...prev, steles_drops: next };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        const token = localStorage.getItem('session_token');
        if (!token) {
            setError(getTranslation('pve.errorLogin', language));
            setSubmitting(false);
            return;
        }
        try {
            await axios.post(`${apiUrl}/groups`, {
                leader_char_id: formData.character_id,
                dungeon_id: Number(formData.dungeon_id),
                title: formData.title,
                stasis: Number(formData.stasis),
                steles_active: formData.steles_active,
                steles_count: formData.steles_active ? Number(formData.steles_count) : 1,
                intervention_active: formData.intervention_active,
                steles_drops: formData.steles_active ? formData.steles_drops : [],
                server: formData.server,
            }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            setSuccess(true);
            setTimeout(() => window.electronAPI?.closeCurrentWindow?.(), 1500);
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorCreate', language));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={rootStyle}>
            <WindowChrome title={getTranslation('pve.createTitle', language)} subtitle="PvE" clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: COLORS.textSecondary }}>{getTranslation('common.loading', language)}</div>
                ) : success ? (
                    <div style={{ textAlign: 'center', color: COLORS.success, fontSize: 14, padding: 20 }}>{getTranslation('pve.created', language)}</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && <div style={{ color: COLORS.error, fontSize: 11, marginBottom: 10 }}>{error}</div>}

                        <div style={{ marginBottom: 12, position: 'relative' }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.dungeon', language)}</label>
                            <input type="text" placeholder={getTranslation('pve.searchPlaceholder', language)} value={dungeonSearch !== '' ? dungeonSearch : (selectedDungeon?.name?.[language] || selectedDungeon?.name?.es || '')} onChange={(e) => { setDungeonSearch(e.target.value); setDungeonOpen(true); if (!e.target.value) setFormData(prev => ({ ...prev, dungeon_id: '' })); }} onFocus={() => { setDungeonSearch(''); setDungeonOpen(true); }} onBlur={() => setTimeout(() => setDungeonOpen(false), 150)} autoComplete="off" style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                            {dungeonOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: COLORS.surfaceElevated, border: `1px solid ${COLORS.border}`, borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 100 }}>
                                    {dungeons.filter(d => { const q = dungeonSearch.toLowerCase(); return !q || getDungeonName(d, language).toLowerCase().includes(q); }).map(dungeon => (
                                        <div key={dungeon.id} onMouseDown={() => { setFormData(prev => ({ ...prev, dungeon_id: String(dungeon.id) })); setDungeonSearch(''); setDungeonOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: `1px solid ${COLORS.borderLight}` }}>{getDungeonName(dungeon, language)} <span style={{ color: COLORS.textSecondary, fontSize: 10 }}>{getTranslation('common.level', language)} {dungeon.modulated}</span></div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.titleOptional', language)}</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={getTranslation('pve.titlePlaceholder', language)} maxLength={100} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                            <div>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('common.stasis', language)}</label>
                                <select value={formData.stasis} onChange={(e) => setFormData({ ...formData, stasis: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('common.server', language)}</label>
                                <select value={formData.server} onChange={(e) => setFormData({ ...formData, server: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                    <option value="Ogrest">Ogrest</option>
                                    <option value="Rubilax">Rubilax</option>
                                    <option value="Pandora">Pandora</option>
                                </select>
                            </div>
                        </div>

                        {hasSteles && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.stelesActiveLabel', language)}</label>
                                <select value={formData.steles_active ? 'yes' : 'no'} onChange={(e) => { const enabled = e.target.value === 'yes'; setFormData({ ...formData, steles_active: enabled }); if (!enabled) setShowDrops(false); }} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                    <option value="no">{getTranslation('common.no', language)}</option>
                                    <option value="yes">{getTranslation('common.yes', language)}</option>
                                </select>
                            </div>
                        )}

                        {hasSteles && formData.steles_active && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.stelesCountLabel', language)}</label>
                                <select value={formData.steles_count} onChange={(e) => setFormData({ ...formData, steles_count: Number(e.target.value) })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                    {Array.from({ length: Math.max(1, stelesLvl) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        )}

                        {hasSteles && formData.steles_active && (
                            <div style={{ marginBottom: 12 }}>
                                <button type="button" onClick={() => window.electronAPI?.openDrops?.(formData.dungeon_id, formData.steles_drops)} style={{ width: '100%', padding: 10, borderRadius: 8, background: formData.steles_drops.length > 0 ? COLORS.success : COLORS.buttonMuted, color: COLORS.lightText, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                                    💎 {getTranslation('pve.dropsCount', language).replace('{count}', String(formData.steles_drops.length))}
                                </button>
                            </div>
                        )}

                        {hasIntervention && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{getTranslation('group.interventionActiveLabel', language)}</label>
                                <select value={formData.intervention_active ? 'yes' : 'no'} onChange={(e) => setFormData({ ...formData, intervention_active: e.target.value === 'yes' })} style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                    <option value="no">{getTranslation('common.no', language)}</option>
                                    <option value="yes">{getTranslation('common.yes', language)}</option>
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Personaje</label>
                            <select value={formData.character_id} onChange={(e) => setFormData({ ...formData, character_id: e.target.value })} required style={{ width: '100%', padding: 8, borderRadius: 6, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 12 }}>
                                <option value="">{getTranslation('group.selectChar', language)}</option>
                                {characters.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.class_name} {getTranslation('common.levelShort', language)} {c.level}</option>)}
                            </select>
                        </div>

                        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, background: COLORS.success, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>{submitting ? getTranslation('pvp.creating', language) : `⚔ ${getTranslation('group.create', language)}`}</button>
                    </form>
                )}
            </div>
        </div>
    );
}

// Vista detalle PVP
function PvpGroupDetailView({ groupId, language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const { requestConfirmation, confirmDialogNode } = useConfirmDialog(language);
    const [apiUrl, setApiUrl] = useState('');
    const [group, setGroup] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [selectedCharId, setSelectedCharId] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [user, setUser] = useState(null);
    const [isMember, setIsMember] = useState(false);
    const [isLeader, setIsLeader] = useState(false);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
    }, []);

    useEffect(() => {
        if (!apiUrl || !groupId) return;
        const token = localStorage.getItem('session_token');
        setLoading(true);
        setError(null);
        Promise.all([
            axios.get(`${apiUrl}/pvp-groups/${groupId}`),
            token ? axios.get(`${apiUrl}/characters`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            token ? axios.get(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        ]).then(([groupRes, charsRes, userRes]) => {
            const g = groupRes.data;
            setGroup(g);
            setCharacters(charsRes.data || []);
            const u = userRes.data;
            setUser(u);
            if ((charsRes.data || []).length > 0) setSelectedCharId(charsRes.data[0].id);
            const memberStatus = !!u && (g.leader_user_id === u.id || (g.members || []).some((m) => m.user_id === u.id));
            setIsMember(memberStatus);
            setIsLeader(!!u && g.leader_user_id === u.id);
        }).catch(() => setError(getTranslation('group.errorLoad', language))).finally(() => setLoading(false));
    }, [apiUrl, groupId]);

    const handleApply = () => {
        if (!selectedCharId || !group) return;
        setApplying(true);
        setError(null);
        const token = localStorage.getItem('session_token');
        axios.post(`${apiUrl}/pvp-applications`, { pvp_group_id: groupId, character_id: selectedCharId }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { setMessage(getTranslation('group.applySent', language)); })
            .catch((err) => setError(err.response?.data?.error || getTranslation('common.error', language)))
            .finally(() => setApplying(false));
    };

    const handleLeaveGroup = async () => {
        if (!user || !apiUrl) return;
        const userChar = characters.find(c => c.user_id === user.id);
        if (!userChar) {
            setError(getTranslation('group.errorNoCharacters', language));
            return;
        }
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmLeave', language),
            variant: 'danger',
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/pvp-groups/${groupId}/members/${userChar.id}`, { headers: { Authorization: `Bearer ${token}` } });
            window.electronAPI?.closeCurrentWindow?.();
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorLeave', language));
        }
    };

    const handleKickMember = async (characterId, charName) => {
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmKick', language).replace('{name}', charName),
            variant: 'danger',
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/pvp-groups/${groupId}/members/${characterId}`, { headers: { Authorization: `Bearer ${token}` } });
            const g = await axios.get(`${apiUrl}/pvp-groups/${groupId}`);
            setGroup(g.data);
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorKick', language));
        }
    };

    const handleLeaveGroupAsLeader = async () => {
        const members = group.members || [];
        if (members.length === 0) {
            const confirmed = await requestConfirmation({
                message: getTranslation('group.confirmClose', language),
                variant: 'danger',
            });
            if (!confirmed) return;
            const token = localStorage.getItem('session_token');
            try {
                await axios.patch(`${apiUrl}/pvp-groups/${groupId}/close`, {}, { headers: { Authorization: `Bearer ${token}` } });
                window.electronAPI?.closeCurrentWindow?.();
            } catch (err) {
                setError(err.response?.data?.error || getTranslation('group.errorClose', language));
            }
            return;
        }
        
        const newLeader = members[0];
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmLeaveLeader', language).replace('{name}', newLeader.char_name),
            variant: 'danger',
        });
        if (!confirmed) return;
        
        const token = localStorage.getItem('session_token');
        try {
            await axios.delete(`${apiUrl}/pvp-groups/${groupId}/leader`, { headers: { Authorization: `Bearer ${token}` } });
            window.electronAPI?.closeCurrentWindow?.();
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorTransfer', language));
        }
    };

    const handleTransferLeadership = async (newLeaderCharId, newLeaderName) => {
        const confirmed = await requestConfirmation({
            message: getTranslation('group.confirmTransfer', language).replace('{name}', newLeaderName),
        });
        if (!confirmed) return;
        const token = localStorage.getItem('session_token');
        try {
            await axios.put(`${apiUrl}/pvp-groups/${groupId}/transfer-leadership`, { new_leader_character_id: newLeaderCharId }, { headers: { Authorization: `Bearer ${token}` } });
            const g = await axios.get(`${apiUrl}/pvp-groups/${groupId}`);
            setGroup(g.data);
        } catch (err) {
            setError(err.response?.data?.error || getTranslation('group.errorTransfer', language));
        }
    };

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    if (!groupId) return <div style={rootStyle}>ID no válido</div>;

    const modeColor = group ? (PVP_MODE_COLORS[group.pvp_mode] || COLORS.primaryDark) : COLORS.primaryDark;
    const slotsPerTeam = getSlotsPerTeam(group?.pvp_mode);
    const isCompact = viewportWidth < 420;

    const allParticipants = [];
    if (group) {
        allParticipants.push({ charId: group.leader_char_id, charName: group.leader_name, classIcon: group.leader_class_icon, className: group.leader_class_name, userId: group.leader_user_id, username: group.leader_username, team: group.leader_team || 'red', isLeader: true });
        (group.members || []).forEach((m) => { allParticipants.push({ charId: m.char_id, charName: m.char_name, classIcon: m.class_icon, className: m.class_name, userId: m.user_id, username: m.username, team: m.team || 'red', isLeader: false }); });
    }
    const redTeam = allParticipants.filter(p => p.team === 'red');
    const blueTeam = allParticipants.filter(p => p.team === 'blue');

    return (
        <div style={rootStyle}>
            <WindowChrome title={getTranslation('pvp.title', language) || 'Enfrentamiento PVP'} subtitle={group?.pvp_mode} clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {loading && <div style={{ textAlign: 'center', color: COLORS.textSecondary }}>{getTranslation('common.loading', language)}</div>}
                {!loading && !group && <div style={{ color: COLORS.error }}>{getTranslation('pvp.notFound', language)}</div>}
                {!loading && group && (
                    <>
                        {group.title && <h3 style={{ marginBottom: 6, fontSize: 14, color: modeColor }}>{group.title}</h3>}
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12, fontSize: 11 }}>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('pvp.mode', language)}:</span> <span style={{ color: modeColor, fontWeight: 700 }}>{group.pvp_mode}</span></div>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.levelShort', language)}</span> {group.equipment_band}</div>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.server', language)}:</span> {group.server}</div>
                            <div><span style={{ color: COLORS.textSecondary }}>{getTranslation('common.status', language)}:</span> {group.status === 'open' ? '🟢' : '🔴'}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr auto 1fr', gap: 8, marginBottom: 12 }}>
                            <div style={{ background: 'rgba(211,107,95,0.1)', border: `2px dashed ${COLORS.pvpRed}`, borderRadius: 10, padding: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: COLORS.pvpRed, textAlign: 'center', marginBottom: 6 }}>🔴 {redTeam.length}/{slotsPerTeam}</div>
                                {redTeam.map((p) => (<div key={p.charId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, background: COLORS.surfaceInset, borderRadius: 4, marginBottom: 4 }}>{p.classIcon && <img src={`${apiUrl}/${p.classIcon}`} alt="" style={{ width: 20, height: 20 }} />}<span style={{ fontSize: 11, flex: 1 }}>{p.charName}</span>{p.isLeader && <span style={{ fontSize: 9, background: COLORS.pvpRed, color: COLORS.darkText, padding: '1px 4px', borderRadius: 3 }}>L</span>}{isLeader && !p.isLeader && (
                                            <button onClick={() => handleKickMember(p.charId, p.charName)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px' }} title={getTranslation('group.kick', language)}>👢</button>
                                        )}</div>))}
                                {Array.from({ length: Math.max(0, slotsPerTeam - redTeam.length) }).map((_, i) => (<div key={`slot-red-${i}`} style={{ height: 32, border: `1.5px dashed ${COLORS.pvpRed}`, borderRadius: 6, opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: COLORS.pvpRed, marginBottom: 4 }}>{getTranslation('common.free', language)}</div>))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: 18, fontWeight: 900, color: COLORS.primaryDark }}>VS</div>
                            <div style={{ background: 'rgba(122,158,184,0.12)', border: `2px dashed ${COLORS.pvpBlue}`, borderRadius: 10, padding: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: COLORS.pvpBlue, textAlign: 'center', marginBottom: 6 }}>🔵 {blueTeam.length}/{slotsPerTeam}</div>
                                {blueTeam.map((p) => (<div key={p.charId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, background: COLORS.surfaceInset, borderRadius: 4, marginBottom: 4 }}>{p.classIcon && <img src={`${apiUrl}/${p.classIcon}`} alt="" style={{ width: 20, height: 20 }} />}<span style={{ fontSize: 11, flex: 1 }}>{p.charName}</span>{p.isLeader && <span style={{ fontSize: 9, background: COLORS.pvpBlue, color: COLORS.darkText, padding: '1px 4px', borderRadius: 3 }}>L</span>}{isLeader && !p.isLeader && (
                                            <button onClick={() => handleKickMember(p.charId, p.charName)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px' }} title={getTranslation('group.kick', language)}>👢</button>
                                        )}</div>))}
                                {Array.from({ length: Math.max(0, slotsPerTeam - blueTeam.length) }).map((_, i) => (<div key={`slot-blue-${i}`} style={{ height: 32, border: `1.5px dashed ${COLORS.pvpBlue}`, borderRadius: 6, opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: COLORS.pvpBlue, marginBottom: 4 }}>{getTranslation('common.free', language)}</div>))}
                            </div>
                        </div>
                        {error && <div style={{ color: COLORS.error, fontSize: 12, marginBottom: 8 }}>{error}</div>}
                        {message && <div style={{ color: COLORS.success, fontSize: 12, marginBottom: 8 }}>{message}</div>}
                        {user && group.status === 'open' && !isMember && (
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Tu personaje</label>
                                <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} style={{ width: '100%', padding: 6, borderRadius: 4, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
                                    <option value="">Elige personaje</option>
                                    {characters.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.class_name} {getTranslation('common.levelShort', language)}{c.level}</option>)}
                                </select>
                                <button onClick={handleApply} disabled={applying || !selectedCharId} style={{ padding: '8px 12px', background: modeColor, color: COLORS.darkText, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 12, width: '100%' }}>{applying ? 'Enviando...' : '⚔ Solicitar'}</button>
                            </div>
                        )}
                        {isMember && !isLeader && (
                            <button onClick={handleLeaveGroup} style={{ width: '100%', padding: 10, marginBottom: 8, background: COLORS.error, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🚪 {getTranslation('group.leave', language)}</button>
                        )}
                        {isLeader && (
                            <>
                                {group.members && group.members.length > 0 && (
                                    <div style={{ marginBottom: 8 }}>
                                        <select onChange={(e) => { if (e.target.value) { handleTransferLeadership(e.target.value, group.members.find(m => m.char_id === e.target.value)?.char_name); e.target.value = ''; } }} style={{ width: '100%', padding: 6, borderRadius: 4, background: COLORS.surfaceInset, color: COLORS.lightText, border: `1px solid ${COLORS.border}`, fontSize: 11 }}>
                                            <option value="">{getTranslation('group.transfer', language)}</option>
                                            {group.members.map((m) => <option key={m.char_id} value={m.char_id}>{m.char_name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button onClick={handleLeaveGroupAsLeader} style={{ width: '100%', padding: 10, marginBottom: 8, background: COLORS.warning, color: COLORS.darkText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🚪 {getTranslation('group.leaveAsLeader', language)}</button>
                            </>
                        )}
                        <button onClick={() => window.electronAPI?.openChat?.(groupId)} style={{ width: '100%', padding: 10, background: COLORS.info, color: COLORS.lightText, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>💬 {getTranslation('chat.open', language)}</button>
                    </>
                )}
            </div>
            {confirmDialogNode}
        </div>
    );
}

function DropsSelectionView({ dungeonId, selectedDrops: initialDrops, language = 'es' }) {
    const { width: viewportWidth } = useViewportSize();
    const [apiUrl, setApiUrl] = useState(API_URL_FALLBACK);
    const [clickThrough, setClickThrough] = useState(false);
    const [opacity, setOpacity] = useState(0.9);
    const [selectedDrops, setSelectedDrops] = useState(initialDrops || []);
    const [dropItems, setDropItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.electronAPI?.getApiUrl?.().then((url) => setApiUrl(url || API_URL_FALLBACK));
        window.electronAPI?.onClickThroughChanged?.((v) => setClickThrough(v));
        const stored = localStorage.getItem('wak_overlay_opacity');
        if (stored) { const v = parseFloat(stored); if (!Number.isNaN(v)) setOpacity(v); }
    }, []);

    useEffect(() => {
        if (!dungeonId) {
            setLoading(false);
            return;
        }

        const dungeon = mazmosData.find(d => String(d.id) === String(dungeonId));
        if (!dungeon || !dungeon.jefeId) {
            setDropItems([]);
            setLoading(false);
            return;
        }

        const mob = wakfuMobs[String(dungeon.jefeId)] || wakfuMobs[dungeon.jefeId];
        if (!mob || !mob.drops) {
            setDropItems([]);
            setLoading(false);
            return;
        }

        const drops = mob.drops.map(d => {
            const itemId = parseInt(d[0], 10);
            const dropRate = d[1];
            const item = itemsData.find(it => it.definition?.item?.id === itemId);

            return {
                id: itemId,
                dropRate,
                title: item?.title || { es: `Item ${itemId}` },
                graphic_parameters: {
                    gfxId: item?.definition?.item?.graphicParameters?.gfxId || null,
                },
            };
        });

        setDropItems(drops);
        setLoading(false);
    }, [dungeonId]);

    const handleOpacityChange = (value) => {
        const n = Math.min(1, Math.max(0.3, value));
        setOpacity(n);
        localStorage.setItem('wak_overlay_opacity', String(n));
        window.electronAPI?.setOpacity?.(n);
    };

    const toggleDrop = (itemId) => {
        setSelectedDrops(prev => {
            const exists = prev.includes(itemId);
            return exists ? prev.filter(id => id !== itemId) : [...prev, itemId];
        });
    };

    const handleConfirm = () => {
        localStorage.setItem('selected_drops', JSON.stringify(selectedDrops));
        localStorage.setItem('drops_selection_done', 'true');
        window.electronAPI?.closeCurrentWindow?.();
    };

    const dungeon = mazmosData.find(d => String(d.id) === String(dungeonId));
    const isCompact = viewportWidth < 360;

    return (
        <div style={rootStyle}>
            <WindowChrome title={getTranslation('drops.title', language)} subtitle={getDungeonName(dungeon, language)} clickThrough={clickThrough} opacity={opacity} onOpacityChange={handleOpacityChange} onToggleClickThrough={() => window.electronAPI?.toggleClickThrough?.()} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: COLORS.textSecondary, padding: 20 }}>{getTranslation('drops.loading', language)}</div>
                ) : dropItems.length === 0 ? (
                    <div style={{ textAlign: 'center', color: COLORS.textSecondary, padding: 20 }}>{getTranslation('drops.none', language)}</div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isCompact ? 52 : 60}px, 1fr))`, gap: 8, padding: 8 }}>
                            {dropItems.map((d) => {
                                const isSelected = selectedDrops.includes(d.id);
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => toggleDrop(d.id)}
                                        style={{
                                            position: 'relative',
                                            textAlign: 'center',
                                            background: isSelected ? COLORS.successSoft : COLORS.surfaceInset,
                                            border: `2px solid ${isSelected ? COLORS.success : COLORS.border}`,
                                            borderRadius: 10,
                                            padding: 8,
                                            cursor: 'pointer',
                                        }}
                                        title={getItemTitle({ title: d.title }, language) || `Item ${d.id}`}
                                    >
                                        <img src={`${apiUrl}/assets/items/${d.graphic_parameters?.gfxId || '0000000'}.png`} alt="" style={{ width: 36, height: 36, borderRadius: 6, display: 'block', margin: '0 auto', background: COLORS.surfaceInset }} />
                                        <div style={{ fontSize: 9, color: COLORS.lightText, marginTop: 4, lineHeight: 1.2 }}>{getItemTitle({ title: d.title }, language) || `Item ${d.id}`}</div>
                                        <div style={{ fontSize: 8, color: COLORS.textSecondary }}>{d.dropRate}</div>
                                        {isSelected && (
                                            <span style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: COLORS.success, color: COLORS.darkText, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={handleConfirm} style={{ width: '100%', padding: 14, background: COLORS.success, color: COLORS.lightText, border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold', fontSize: 14, marginTop: 12 }}>
                            {getTranslation('drops.confirm', language).replace('{count}', String(selectedDrops.length))}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function App() {
    const [hashView, setHashView] = useState(getViewFromHash);
    const [language, setLanguageState] = useState(getLanguage);

    useEffect(() => {
        const onHash = () => setHashView(getViewFromHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const setLanguage = (lang) => {
        setLanguageState(lang);
        setLanguage(lang);
    };

    if (hashView.view === 'drops') return <DropsSelectionView dungeonId={hashView.dungeonId} selectedDrops={hashView.selectedDrops} language={language} />;
    if (hashView.view === 'create-pvp') return <CreatePvpGroupView language={language} />;
    if (hashView.view === 'create-pve') return <CreatePveGroupView language={language} />;
    if (hashView.view === 'pvp') return <PvpGroupDetailView groupId={hashView.groupId} language={language} />;
    if (hashView.view === 'group') return <GroupDetailView groupId={hashView.groupId} language={language} />;
    if (hashView.view === 'chat') return <ChatView groupId={hashView.groupId} language={language} />;
    return <MainView language={language} setLanguage={setLanguage} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

